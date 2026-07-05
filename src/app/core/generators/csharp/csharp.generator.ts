import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class CSharpGenerator extends BaseGenerator {
  languageId = 'csharp';
  displayName = 'C#';
  defaultFileName = 'Models.cs';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = 'using System;\nusing System.Collections.Generic;\nusing System.Text.Json.Serialization;\n\n';

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
    let out = `public enum ${c.name}\n{\n`;
    if (c.enumValues) {
      for (let i = 0; i < c.enumValues.length; i++) {
        const val = c.enumValues[i];
        const key = this.toEnumKey(val);
        const comma = i === c.enumValues.length - 1 ? '' : ',';
        out += `    ${key}${comma}\n`;
      }
    }
    out += `}`;
    return out;
  }

  private generateClass(c: ClassNode, options: GeneratorOptions): string {
    let out = `public class ${c.name}\n{\n`;
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      const nullSuffix = isNull ? '?' : '';

      // Add JsonPropertyName attribute for mapping
      out += `    [JsonPropertyName("${prop.name}")]\n`;
      
      // PascalCase property name for C# standards
      const csharpPropName = this.toPascalCase(prop.safeName);
      out += `    public ${typeStr}${nullSuffix} ${csharpPropName} { get; set; }\n\n`;
    }
    out += `}`;
    return out;
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'string';
        if (type.primitiveType === 'number') return 'double';
        if (type.primitiveType === 'boolean') return 'bool';
        return 'object';
      case 'object':
        return type.targetClass || 'object';
      case 'array':
        return `List<${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}>`;
      case 'enum':
        return type.targetClass || 'string';
      case 'date':
        return 'DateTime';
      case 'null':
        return 'object';
      default:
        return 'object';
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

  private toPascalCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
