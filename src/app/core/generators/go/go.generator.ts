import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class GoGenerator extends BaseGenerator {
  languageId = 'go';
  displayName = 'Go';
  defaultFileName = 'models.go';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let hasTime = false;
    
    // Check if any struct property uses time.Time
    for (const c of modelTree.classes) {
      if (!c.isEnum) {
        for (const prop of c.properties) {
          if (prop.type.kind === 'date') {
            hasTime = true;
            break;
          }
        }
      }
      if (hasTime) break;
    }

    let result = 'package models\n\n';
    if (hasTime) {
      result += 'import (\n\t"time"\n)\n\n';
    }

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
    let out = `type ${c.name} string\n\nconst (\n`;
    if (c.enumValues) {
      for (const val of c.enumValues) {
        const key = this.toEnumKey(c.name, val);
        out += `\t${key} ${c.name} = "${val}"\n`;
      }
    }
    out += `)`;
    return out;
  }

  private generateStruct(c: ClassNode, options: GeneratorOptions): string {
    let out = `type ${c.name} struct {\n`;
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      
      const ptrPrefix = isNull ? '*' : '';
      const goPropName = this.toPascalCase(prop.safeName);
      const omitEmpty = prop.type.isOptional ? ',omitempty' : '';

      out += `\t${goPropName} ${ptrPrefix}${typeStr} \`json:"${prop.name}${omitEmpty}"\`\n`;
    }
    out += `}`;
    return out;
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'string';
        if (type.primitiveType === 'number') return 'float64';
        if (type.primitiveType === 'boolean') return 'bool';
        return 'interface{}';
      case 'object':
        return type.targetClass || 'interface{}';
      case 'array':
        return `[]${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}`;
      case 'enum':
        return type.targetClass || 'string';
      case 'date':
        return 'time.Time';
      case 'null':
        return 'interface{}';
      default:
        return 'interface{}';
    }
  }

  private toEnumKey(enumName: string, val: string): string {
    if (!val) return enumName + 'Unknown';
    const clean = val.replace(/[^a-zA-Z0-9]+/g, '_');
    const key = clean
      .split('_')
      .filter(x => x.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    return enumName + (key || 'Value');
  }

  private toPascalCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
