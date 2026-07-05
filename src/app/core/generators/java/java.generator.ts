import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class JavaGenerator extends BaseGenerator {
  languageId = 'java';
  displayName = 'Java';
  defaultFileName = 'Models.java';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = 'import java.util.List;\nimport java.util.Date;\nimport com.fasterxml.jackson.annotation.JsonProperty;\n\n';

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
    let out = `public enum ${c.name} {\n`;
    if (c.enumValues) {
      for (let i = 0; i < c.enumValues.length; i++) {
        const val = c.enumValues[i];
        const key = this.toEnumKey(val);
        const comma = i === c.enumValues.length - 1 ? ';' : ',';
        out += `    ${key}("${val}")${comma}\n`;
      }
    }
    out += `\n    private final String value;\n\n`;
    out += `    ${c.name}(String value) {\n`;
    out += `        this.value = value;\n`;
    out += `    }\n\n`;
    out += `    @com.fasterxml.jackson.annotation.JsonValue\n`;
    out += `    public String getValue() {\n`;
    out += `        return value;\n`;
    out += `    }\n`;
    out += `}`;
    return out;
  }

  private generateClass(c: ClassNode, options: GeneratorOptions): string {
    let out = `public class ${c.name} {\n`;
    
    // Declarations
    for (const prop of c.properties) {
      const typeStr = this.mapType(prop.type, options);
      out += `    @JsonProperty("${prop.name}")\n`;
      out += `    private ${typeStr} ${prop.safeName};\n\n`;
    }

    // Getters and Setters
    for (const prop of c.properties) {
      const typeStr = this.mapType(prop.type, options);
      const capName = prop.safeName.charAt(0).toUpperCase() + prop.safeName.slice(1);
      
      // Getter
      out += `    public ${typeStr} get${capName}() {\n`;
      out += `        return this.${prop.safeName};\n`;
      out += `    }\n\n`;

      // Setter
      out += `    public void set${capName}(${typeStr} ${prop.safeName}) {\n`;
      out += `        this.${prop.safeName} = ${prop.safeName};\n`;
      out += `    }\n\n`;
    }

    out = out.trim() + '\n}';
    return out;
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'String';
        if (type.primitiveType === 'number') return 'Double';
        if (type.primitiveType === 'boolean') return 'Boolean';
        return 'Object';
      case 'object':
        return type.targetClass || 'Object';
      case 'array':
        return `List<${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}>`;
      case 'enum':
        return type.targetClass || 'String';
      case 'date':
        return 'Date';
      case 'null':
        return 'Object';
      default:
        return 'Object';
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
