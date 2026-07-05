import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class KotlinGenerator extends BaseGenerator {
  languageId = 'kotlin';
  displayName = 'Kotlin';
  defaultFileName = 'Models.kt';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = 'import java.util.Date\nimport com.google.gson.annotations.SerializedName\n\n';

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
    let out = `enum class ${c.name}(val value: String) {\n`;
    if (c.enumValues) {
      for (let i = 0; i < c.enumValues.length; i++) {
        const val = c.enumValues[i];
        const key = this.toEnumKey(val);
        const comma = i === c.enumValues.length - 1 ? ';' : ',';
        out += `    @SerializedName("${val}")\n`;
        out += `    ${key}("${val}")${comma}\n`;
      }
    }
    out += `}`;
    return out;
  }

  private generateClass(c: ClassNode, options: GeneratorOptions): string {
    let out = `data class ${c.name}(\n`;
    for (let i = 0; i < c.properties.length; i++) {
      const prop = c.properties[i];
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      const nullSuffix = isNull ? '?' : '';
      const comma = i === c.properties.length - 1 ? '' : ',';

      out += `    @SerializedName("${prop.name}")\n`;
      out += `    val ${prop.safeName}: ${typeStr}${nullSuffix}${comma}\n`;
    }
    out += `)`;
    return out;
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'String';
        if (type.primitiveType === 'number') return 'Double';
        if (type.primitiveType === 'boolean') return 'Boolean';
        return 'Any';
      case 'object':
        return type.targetClass || 'Any';
      case 'array':
        return `List<${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}>`;
      case 'enum':
        return type.targetClass || 'String';
      case 'date':
        return 'Date';
      case 'null':
        return 'Any';
      default:
        return 'Any';
    }
  }

  private toEnumKey(val: string): string {
    if (!val) return 'UNKNOWN';
    const clean = val.replace(/[^a-zA-Z0-9]+/g, '_');
    const key = clean
      .split('_')
      .filter(x => x.length > 0)
      .map(word => word.toUpperCase())
      .join('_');
    return key || 'VALUE';
  }
}
