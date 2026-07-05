import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class AngularClassGenerator extends BaseGenerator {
  languageId = 'typescript';
  displayName = 'Angular Class';
  defaultFileName = 'models.ts';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = '';

    for (const c of modelTree.classes) {
      if (c.isEnum) {
        result += this.generateEnum(c);
      } else {
        result += this.generateClass(c, options);
      }
      result += '\n\n';
    }

    return result.trim();
  }

  private generateEnum(c: ClassNode): string {
    let out = `export enum ${c.name} {\n`;
    if (c.enumValues) {
      for (const val of c.enumValues) {
        const key = this.toEnumKey(val);
        out += `  ${key} = '${val}',\n`;
      }
    }
    out += `}`;
    return out;
  }

  private generateClass(c: ClassNode, options: GeneratorOptions): string {
    let out = `export class ${c.name} {\n`;
    
    // Properties declaration
    for (const prop of c.properties) {
      const isOpt = prop.type.isOptional;
      const isNull = prop.type.isNullable && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type);
      
      const optionalMark = (isOpt || isNull) ? '?' : '';
      const nullSuffix = isNull ? ' | null' : '';
      
      out += `  ${prop.safeName}${optionalMark}: ${typeStr}${nullSuffix};\n`;
    }

    // Constructor
    out += `\n  constructor(data?: Partial<${c.name}>) {\n`;
    out += `    if (data) {\n`;
    for (const prop of c.properties) {
      // For Dates, parse them in constructor if they are dates
      if (prop.type.kind === 'date') {
        out += `      this.${prop.safeName} = data.${prop.safeName} ? new Date(data.${prop.safeName}) : undefined;\n`;
      } else {
        out += `      this.${prop.safeName} = data.${prop.safeName};\n`;
      }
    }
    out += `    }\n`;
    out += `  }\n`;
    out += `}`;

    return out;
  }

  private mapType(type: TypeNode): string {
    switch (type.kind) {
      case 'primitive':
        return type.primitiveType || 'any';
      case 'object':
        return type.targetClass || 'any';
      case 'array':
        return `${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false })}[]`;
      case 'enum':
        return type.targetClass || 'string';
      case 'date':
        return 'Date';
      case 'null':
        return 'any';
      default:
        return 'any';
    }
  }

  private toEnumKey(val: string): string {
    if (!val) return 'Unknown';
    const clean = val.replace(/[^a-zA-Z0-9]+/g, '_');
    const key = clean
      .split('_')
      .filter(x => x.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return key || 'Value';
  }
}
