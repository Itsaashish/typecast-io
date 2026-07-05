import { Injectable, signal } from '@angular/core';
import { BaseGenerator, GeneratorOptions } from '../generators/base.generator';
import { TypeScriptGenerator } from '../generators/angular/typescript.generator';
import { AngularClassGenerator } from '../generators/angular/angular-class.generator';
import { CSharpGenerator } from '../generators/csharp/csharp.generator';
import { JavaGenerator } from '../generators/java/java.generator';
import { KotlinGenerator } from '../generators/kotlin/kotlin.generator';
import { DartGenerator } from '../generators/dart/dart.generator';
import { SwiftGenerator } from '../generators/swift/swift.generator';
import { GoGenerator } from '../generators/go/go.generator';
import { PythonGenerator } from '../generators/python/python.generator';
import { ModelTree } from '../../shared/models/class.model';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  public generators: BaseGenerator[] = [
    new TypeScriptGenerator(),
    new AngularClassGenerator(),
    new CSharpGenerator(),
    new JavaGenerator(),
    new KotlinGenerator(),
    new DartGenerator(),
    new SwiftGenerator(),
    new GoGenerator(),
    new PythonGenerator()
  ];

  // Active generator signal (default to TS Interface)
  public activeGenerator = signal<BaseGenerator>(this.generators[0]);

  constructor() {
    // Load saved language preference from localStorage if it exists
    const savedLang = localStorage.getItem('generator-language-id');
    if (savedLang) {
      const found = this.generators.find(g => g.displayName === savedLang || g.languageId === savedLang);
      if (found) {
        this.activeGenerator.set(found);
      }
    }
  }

  public selectLanguage(generator: BaseGenerator): void {
    this.activeGenerator.set(generator);
    localStorage.setItem('generator-language-id', generator.displayName);
  }

  public generateCode(modelTree: ModelTree, options: GeneratorOptions): string {
    const generator = this.activeGenerator();
    return generator.generate(modelTree, options);
  }
}
