import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.css'
})
export class CodeEditorComponent implements OnInit, OnChanges {
  @ViewChild('textarea', { static: true }) textareaElement!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('gutter') gutterElement?: ElementRef<HTMLDivElement>;

  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() language: string = 'json';
  @Input() readOnly: boolean = false;
  @Input() wordWrap: 'on' | 'off' = 'off';

  lineNumbers: number[] = [];

  ngOnInit() {
    this.updateLineNumbers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      // Sync value without resetting selection/cursor position if typing
      if (this.textareaElement && this.textareaElement.nativeElement) {
        const textarea = this.textareaElement.nativeElement;
        if (textarea.value !== this.value) {
          textarea.value = this.value;
        }
      }
      this.updateLineNumbers();
    }
  }

  onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const newValue = target.value;
    this.value = newValue;
    this.valueChange.emit(newValue);
    this.updateLineNumbers();
  }

  onScroll() {
    if (this.gutterElement && this.textareaElement) {
      this.gutterElement.nativeElement.scrollTop = this.textareaElement.nativeElement.scrollTop;
    }
  }

  updateLineNumbers() {
    const linesCount = this.value.split('\n').length || 1;
    this.lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);
  }
}
