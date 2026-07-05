import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class TypeScriptGenerator extends BaseGenerator {
  languageId = 'typescript';
  displayName = 'Angular Interface';
  defaultFileName = 'models.ts';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = '';

    for (const c of modelTree.classes) {
      if (c.isEnum) {
        result += this.generateEnum(c);
      } else {
        result += this.generateInterface(c, options);
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

  private generateInterface(c: ClassNode, options: GeneratorOptions): string {
    let out = `export interface ${c.name} {\n`;
    for (const prop of c.properties) {
      const isOpt = prop.type.isOptional;
      const isNull = prop.type.isNullable && options.isNullableEnabled;
      
      const typeStr = this.mapType(prop.type);
      const nameSuffix = isOpt ? '?' : '';
      const typeSuffix = isNull ? ' | null' : '';

      out += `  ${prop.safeName}${nameSuffix}: ${typeStr}${typeSuffix};\n`;
    }
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
    // Clean up non-alphanumeric
    const clean = val.replace(/[^a-zA-Z0-9]+/g, '_');
    const key = clean
      .split('_')
      .filter(x => x.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return key || 'Value';
  }
}
