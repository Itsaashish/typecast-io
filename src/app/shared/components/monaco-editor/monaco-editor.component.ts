import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

declare const require: any;
declare const monaco: any;

@Component({
  selector: 'app-monaco-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monaco-editor.component.html',
  styleUrl: './monaco-editor.component.css'
})
export class MonacoEditorComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() language: string = 'json';
  @Input() readOnly: boolean = false;
  @Input() wordWrap: 'on' | 'off' = 'off';

  public loading = true;
  private editor: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeService = inject(ThemeService);

  ngOnInit() {
    this.loadMonaco();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.editor) return;

    if (changes['value'] && changes['value'].currentValue !== this.editor.getValue()) {
      this.editor.setValue(changes['value'].currentValue);
    }

    if (changes['language']) {
      const model = this.editor.getModel();
      if (model) {
        // Map common language extensions/IDs to Monaco equivalents
        const monacoLang = this.mapLanguageId(changes['language'].currentValue);
        monaco.editor.setModelLanguage(model, monacoLang);
      }
    }

    if (changes['readOnly'] || changes['wordWrap']) {
      this.editor.updateOptions({
        readOnly: this.readOnly,
        wordWrap: this.wordWrap
      });
    }
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.dispose();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private mapLanguageId(lang: string): string {
    const l = lang.toLowerCase();
    if (l === 'typescript' || l === 'angular interface' || l === 'angular class' || l === 'angular') return 'typescript';
    if (l === 'csharp' || l === 'c#') return 'csharp';
    if (l === 'java') return 'java';
    if (l === 'kotlin') return 'kotlin';
    if (l === 'dart') return 'typescript'; // Monaco has no native Dart syntax highlight by default; TS/JS or C# works best
    if (l === 'swift') return 'swift';
    if (l === 'go') return 'go';
    if (l === 'python') return 'python';
    if (l === 'json') return 'json';
    if (l === 'xml') return 'xml';
    if (l === 'yaml' || l === 'yml') return 'yaml';
    return 'plaintext';
  }

  private loadMonaco() {
    if (typeof monaco !== 'undefined') {
      this.initEditor();
      return;
    }

    const checkAndInit = () => {
      if ((window as any).require && (window as any).monaco) {
        this.initEditor();
      } else if ((window as any).require) {
        (window as any).require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
        });
        (window as any).require(['vs/editor/editor.main'], () => {
          this.initEditor();
        });
      } else {
        setTimeout(checkAndInit, 30);
      }
    };

    checkAndInit();
  }

  private initEditor() {
    this.loading = false;
    const theme = this.themeService.isDark() ? 'vs-dark' : 'vs';
    const monacoLang = this.mapLanguageId(this.language);

    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.value,
      language: monacoLang,
      readOnly: this.readOnly,
      theme: theme,
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: this.wordWrap,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      padding: { top: 12, bottom: 12 }
    });

    // Notify values changes
    this.editor.onDidChangeModelContent(() => {
      const val = this.editor.getValue();
      if (val !== this.value) {
        this.value = val;
        this.valueChange.emit(val);
      }
    });

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => {
      this.editor?.layout();
    });
    this.resizeObserver.observe(this.editorContainer.nativeElement);

    // Watch for global theme switches
    // We register a simple effect or watch changes manually from theme service
    // To update the editor theme on change:
    const themeWatcher = setInterval(() => {
      if (this.editor) {
        const expectedTheme = this.themeService.isDark() ? 'vs-dark' : 'vs';
        // Check current option
        monaco.editor.setTheme(expectedTheme);
      }
    }, 500);

    // Stop watcher on destroy
    this.editor.onDidDispose(() => {
      clearInterval(themeWatcher);
    });
  }
}
