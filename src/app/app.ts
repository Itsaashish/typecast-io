import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';
import { JSONParserService } from './core/services/json-parser.service';
import { ClipboardService } from './core/services/clipboard.service';
import { DownloadService } from './core/services/download.service';
import { ToastService } from './core/services/toast.service';
import { MonacoEditorComponent } from './shared/components/monaco-editor/monaco-editor.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { BaseGenerator } from './core/generators/base.generator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MonacoEditorComponent,
    ToastComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Services
  public themeService = inject(ThemeService);
  public languageService = inject(LanguageService);
  public parserService = inject(JSONParserService);
  public clipboardService = inject(ClipboardService);
  public downloadService = inject(DownloadService);
  public toastService = inject(ToastService);

  // Component State
  public jsonInput = signal<string>('');
  public generatedCode = signal<string>('');
  public inputFormat = signal<string>('json');

  public inputFormats = [
    { id: 'json', displayName: 'JSON' },
    /*
    { id: 'xml', displayName: 'XML' },
    { id: 'yaml', displayName: 'YAML' },
    { id: 'csv', displayName: 'CSV' },
    { id: 'typescript', displayName: 'Angular Interface' },
    { id: 'angular-class', displayName: 'Angular Class' },
    { id: 'csharp', displayName: 'C#' },
    { id: 'java', displayName: 'Java' },
    { id: 'kotlin', displayName: 'Kotlin' },
    { id: 'dart', displayName: 'Dart' },
    { id: 'swift', displayName: 'Swift' },
    { id: 'go', displayName: 'Go Struct' },
    { id: 'python', displayName: 'Python Dataclass' }
    */
  ];

  public themes: ('dark' | 'light' | 'slate' | 'coffee' | 'cupcake' | 'synthwave' | 'dracula' | 'nord')[] = ['dark', 'light', 'slate', 'coffee', 'cupcake', 'synthwave', 'dracula', 'nord'];

  // Toggles
  public isNullable = signal<boolean>(true);
  public isGenerating = signal<boolean>(false);
  public isDragOver = signal<boolean>(false);
  public wordWrap = signal<'on' | 'off'>('off');
  public isFullscreen = signal<boolean>(false);
  
  // Search for languages
  public searchQuery = signal<string>('');
  public showSearchDropdown = signal<boolean>(false);

  // Friendly error reporting
  public validationError = signal<string | null>(null);

  private debounceTimer: any = null;

  // Initial demonstration JSON
  private readonly defaultJson = {
    id: 101,
    name: "John Doe",
    email: "john@example.com",
    age: 24,
    isActive: true
  };



  ngOnInit() {
    // Load saved preferences if any
    const savedNullable = localStorage.getItem('preference-nullable');
    if (savedNullable !== null) {
      this.isNullable.set(savedNullable === 'true');
    }

    const savedWrap = localStorage.getItem('preference-wrap');
    if (savedWrap !== null) {
      this.wordWrap.set(savedWrap === 'on' ? 'on' : 'off');
    }

    // Set initial value
    this.jsonInput.set(JSON.stringify(this.defaultJson, null, 2));
    this.generate();
  }

  /**
   * Listen to global shortcuts
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const isMeta = event.ctrlKey || event.metaKey;

    // Ctrl + Enter: Generate
    if (isMeta && event.key === 'Enter') {
      event.preventDefault();
      this.generate();
    }
    // Ctrl + Shift + C: Copy
    if (isMeta && event.shiftKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      this.copyOutput();
    }
    // Ctrl + K: Clear
    if (isMeta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.clearInput();
    }
  }

  /**
   * Debounced typing handler
   */
  onJsonChange(newVal: string) {
    this.jsonInput.set(newVal);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.generate();
    }, 300);
  }

  /**
   * Trigger validation and generate code
   */
  generate() {
    const rawJson = this.jsonInput();
    if (!rawJson.trim()) {
      this.generatedCode.set('');
      this.validationError.set(null);
      return;
    }

    // Validate
    const errorMsg = this.parserService.validateInput(rawJson, this.inputFormat());
    this.validationError.set(errorMsg);

    if (errorMsg) {
      return;
    }

    this.isGenerating.set(true);

    // Snap loading timer for rich visual effect
    setTimeout(() => {
      try {
        const modelTree = this.parserService.parse(rawJson, this.inputFormat());
        const options = {
          isNullableEnabled: this.isNullable()
        };
        const code = this.languageService.generateCode(modelTree, options);
        this.generatedCode.set(code);
      } catch (err: any) {
        this.validationError.set(`❌ Generation Error: ${err.message}`);
      } finally {
        this.isGenerating.set(false);
      }
    }, 150);
  }

  /**
   * Format input in place based on format
   */
  prettyFormat() {
    const current = this.jsonInput();
    if (!current.trim()) return;
    const formatted = this.parserService.prettyPrint(current, this.inputFormat());
    this.jsonInput.set(formatted);
    this.generate();
    this.toastService.show(`Formatted input ${this.inputFormat().toUpperCase()}`, 'success');
  }

  /**
   * Change input format and load corresponding default template if current is default
   */
  setInputFormat(format: string) {
    const current = this.jsonInput().trim();
    
    // Check if input is empty or matches the default JSON
    const isDefault = !current || 
      current === JSON.stringify(this.defaultJson, null, 2).trim();

    this.inputFormat.set(format);
    
    if (isDefault) {
      if (format === 'json') {
        this.jsonInput.set(JSON.stringify(this.defaultJson, null, 2));
      }
    }
    
    this.generate();
    const formatName = this.inputFormats.find(f => f.id === format)?.displayName || format.toUpperCase();
    this.toastService.show(`Switched input format to: ${formatName}`, 'info');
  }

  /**
   * Clear input and output
   */
  clearInput() {
    this.jsonInput.set('');
    this.generatedCode.set('');
    this.validationError.set(null);
    this.toastService.show('Editor cleared', 'info');
  }

  /**
   * Paste text from user clipboard
   */
  async pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.jsonInput.set(text);
        this.generate();
        this.toastService.show('Pasted from clipboard', 'success');
      } else {
        this.toastService.show('Clipboard is empty!', 'warning');
      }
    } catch (e) {
      this.toastService.show('Clipboard read blocked! Please press Cmd/Ctrl + V to paste', 'warning');
    }
  }

  /**
   * Select a language and regenerate
   */
  selectLanguage(gen: BaseGenerator) {
    this.languageService.selectLanguage(gen);
    this.generate();
    this.showSearchDropdown.set(false);
    this.searchQuery.set('');
    this.toastService.show(`Switched generator to: ${gen.displayName}`, 'info');
  }

  /**
   * Filters generators list for search component
   */
  getFilteredGenerators(): BaseGenerator[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.languageService.generators;
    return this.languageService.generators.filter(g => 
      g.displayName.toLowerCase().includes(q) || g.languageId.toLowerCase().includes(q)
    );
  }

  /**
   * Hide dropdown with small delay so click events register before it disappears
   */
  hideDropdownWithDelay() {
    setTimeout(() => {
      this.showSearchDropdown.set(false);
    }, 200);
  }

  /**
   * Toggle Nullable Mode
   */
  toggleNullable() {
    const val = !this.isNullable();
    this.isNullable.set(val);
    localStorage.setItem('preference-nullable', val ? 'true' : 'false');
    this.generate();
    this.toastService.show(`Nullable types ${val ? 'enabled' : 'disabled'}`, 'info');
  }

  /**
   * Copy generated code
   */
  copyOutput() {
    const code = this.generatedCode();
    const lang = this.languageService.activeGenerator().displayName;
    this.clipboardService.copy(code, `Copied ${lang} code to clipboard!`);
  }

  /**
   * Download model file
   */
  downloadOutput() {
    const code = this.generatedCode();
    const active = this.languageService.activeGenerator();
    const filename = active.defaultFileName;
    this.downloadService.downloadFile(code, filename);
  }

  /**
   * Toggle Wrap Word
   */
  toggleWrap() {
    const val = this.wordWrap() === 'on' ? 'off' : 'on';
    this.wordWrap.set(val);
    localStorage.setItem('preference-wrap', val);
    this.toastService.show(`Word wrap ${val === 'on' ? 'enabled' : 'disabled'}`, 'info');
  }

  /**
   * Toggle Fullscreen Mode
   */
  toggleFullscreen() {
    this.isFullscreen.update(v => !v);
  }

  // --- Drag & Drop Handlers ---
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let detectedFormat: 'json' | 'xml' | 'yaml' | 'csv' | null = null;
    
    if (ext === 'json') detectedFormat = 'json';
    else if (ext === 'xml') detectedFormat = 'xml';
    else if (ext === 'yaml' || ext === 'yml') detectedFormat = 'yaml';
    else if (ext === 'csv') detectedFormat = 'csv';

    if (!detectedFormat) {
      this.toastService.show('Please upload a supported file (.json, .xml, .yaml, .yml, .csv)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.inputFormat.set(detectedFormat!);
      this.jsonInput.set(content);
      this.generate();
      this.toastService.show(`Loaded ${detectedFormat!.toUpperCase()} from ${file.name}`, 'success');
    };
    reader.onerror = () => {
      this.toastService.show('Failed to read file!', 'error');
    };
    reader.readAsText(file);
  }
}
