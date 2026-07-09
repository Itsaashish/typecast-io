import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class PythonGenerator extends BaseGenerator {
  languageId = 'python';
  displayName = 'Python';
  defaultFileName = 'models.py';

  generate(modelTree: ModelTree, options: GeneratorOptions): string {
    let result = 'from __future__ import annotations\n';
    result += 'from dataclasses import dataclass\n';
    result += 'from typing import List, Optional, Any\n';
    result += 'from datetime import datetime\n';
    
    // Check if any enum is used
    const hasEnum = modelTree.classes.some(c => c.isEnum);
    if (hasEnum) {
      result += 'from enum import Enum\n';
    }
    result += '\n';

    for (const c of modelTree.classes) {
      if (c.isEnum) {
        result += this.generateEnum(c);
      } else {
        result += this.generateDataclass(c, options);
      }
      result += '\n\n';
    }

    return result.trim();
  }

  private generateEnum(c: ClassNode): string {
    let out = `class ${c.name}(str, Enum):\n`;
    if (c.enumValues && c.enumValues.length > 0) {
      for (const val of c.enumValues) {
        const key = this.toEnumKey(val);
        out += `    ${key} = "${val}"\n`;
      }
    } else {
      out += `    PASS = "PASS"\n`;
    }
    return out;
  }

  private generateDataclass(c: ClassNode, options: GeneratorOptions): string {
    let out = `@dataclass\nclass ${c.name}:\n`;
    
    if (c.properties.length === 0) {
      out += `    pass`;
      return out;
    }

    // Python dataclasses require fields with default values to be defined after fields without default values.
    // So we sort properties: non-optional first, optional (with default `= None`) second.
    const sortedProps = [...c.properties].sort((a, b) => {
      const aIsOpt = (a.type.isOptional || a.type.isNullable) && options.isNullableEnabled;
      const bIsOpt = (b.type.isOptional || b.type.isNullable) && options.isNullableEnabled;
      return (aIsOpt ? 1 : 0) - (bIsOpt ? 1 : 0);
    });

    for (const prop of sortedProps) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      
      const snakeName = prop.safeName;
      if (isNull) {
        out += `    ${snakeName}: Optional[${typeStr}] = None\n`;
      } else {
        out += `    ${snakeName}: ${typeStr}\n`;
      }
    }
    return out.trim();
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'str';
        if (type.primitiveType === 'number') return 'float';
        if (type.primitiveType === 'boolean') return 'bool';
        return 'Any';
      case 'object':
        return type.targetClass || 'Any';
      case 'array':
        return `List[${this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options)}]`;
      case 'enum':
        return type.targetClass || 'str';
      case 'date':
        return 'datetime';
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

  private toSnakeCase(str: string): string {
    // Convert camelCase or PascalCase or spaces to snake_case
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toLowerCase();
  }
}
