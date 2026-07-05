import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class SwiftGenerator extends BaseGenerator {
  languageId = 'swift';
  displayName = 'Swift';
  defaultFileName = 'Models.swift';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = 'import Foundation\n\n';

    for (const c of modelTree.classes) {
      if (c.isEnum) {
        result += this.generateEnum(c);
      } else {
        result += this.generateStruct(c, options);
      }
      result += '\n\n';
    }

    return result.trim();
  }

  private generateEnum(c: ClassNode): string {
    let out = `enum ${c.name}: String, Codable {\n`;
    if (c.enumValues) {
      for (const val of c.enumValues) {
        const key = this.toEnumKey(val);
        out += `    case ${key} = "${val}"\n`;
      }
    }
    out += `}`;
    return out;
  }

  private generateStruct(c: ClassNode, options: GeneratorOptions): string {
    let out = `struct ${c.name}: Codable {\n`;
    
    // Properties
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      const nullSuffix = isNull ? '?' : '';
      out += `    let ${prop.safeName}: ${typeStr}${nullSuffix}\n`;
    }

    // Coding Keys
    out += `\n    enum CodingKeys: String, CodingKey {\n`;
    for (const prop of c.properties) {
      out += `        case ${prop.safeName} = "${prop.name}"\n`;
    }
    out += `    }\n`;

    out += `}`;
    return out;
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'String';
        if (type.primitiveType === 'number') return 'Double';
        if (type.primitiveType === 'boolean') return 'Bool';
        return 'String';
      case 'object':
        return type.targetClass || 'String';
      case 'array':
        return `[${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}]`;
      case 'enum':
        return type.targetClass || 'String';
      case 'date':
        return 'Date';
      case 'null':
        return 'String';
      default:
        return 'String';
    }
  }

  private toEnumKey(val: string): string {
    if (!val) return 'unknown';
    // camelCase for Swift enum cases
    const clean = val.replace(/[^a-zA-Z0-9]+/g, '_');
    const key = clean
      .split('_')
      .filter(x => x.length > 0)
      .map((word, idx) => {
        if (idx === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
    return key || 'value';
  }
}
