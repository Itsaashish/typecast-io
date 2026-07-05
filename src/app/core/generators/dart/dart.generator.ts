import { BaseGenerator, GeneratorOptions } from '../base.generator';
import { ModelTree, ClassNode } from '../../../shared/models/class.model';
import { TypeNode, PropertyNode } from '../../../shared/models/property.model';

export class DartGenerator extends BaseGenerator {
  languageId = 'dart';
  displayName = 'Dart';
  defaultFileName = 'models.dart';

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
    let out = `enum ${c.name} {\n`;
    if (c.enumValues) {
      for (let i = 0; i < c.enumValues.length; i++) {
        const val = c.enumValues[i];
        const key = this.toEnumKey(val);
        const comma = i === c.enumValues.length - 1 ? '' : ',';
        out += `  ${key}${comma}\n`;
      }
    }
    out += `}`;
    return out;
  }

  private generateClass(c: ClassNode, options: GeneratorOptions): string {
    let out = `class ${c.name} {\n`;
    
    // Properties
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const typeStr = this.mapType(prop.type, options);
      const nullSuffix = isNull ? '?' : '';
      out += `  final ${typeStr}${nullSuffix} ${prop.safeName};\n`;
    }
    
    out += '\n';

    // Constructor
    out += `  ${c.name}({\n`;
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const prefix = isNull ? '' : 'required ';
      out += `    ${prefix}this.${prop.safeName},\n`;
    }
    out += `  });\n\n`;

    // FromJson factory
    out += `  factory ${c.name}.fromJson(Map<String, dynamic> json) {\n`;
    out += `    return ${c.name}(\n`;
    for (const prop of c.properties) {
      const isNull = (prop.type.isNullable || prop.type.isOptional) && options.isNullableEnabled;
      const mapExpression = this.generateFromJsonMapping(prop, isNull);
      out += `      ${prop.safeName}: ${mapExpression},\n`;
    }
    out += `    );\n`;
    out += `  }\n`;

    out += `}`;
    return out;
  }

  private generateFromJsonMapping(prop: PropertyNode, isNull: boolean): string {
    const rawAccess = `json['${prop.name}']`;
    
    switch (prop.type.kind) {
      case 'primitive':
        if (prop.type.primitiveType === 'any') return rawAccess;
        return rawAccess;
      case 'date':
        if (isNull) {
          return `${rawAccess} != null ? DateTime.parse(${rawAccess}) : null`;
        }
        return `DateTime.parse(${rawAccess})`;
      case 'object':
        if (isNull) {
          return `${rawAccess} != null ? ${prop.type.targetClass}.fromJson(${rawAccess}) : null`;
        }
        return `${prop.type.targetClass}.fromJson(${rawAccess})`;
      case 'enum':
        const enumName = prop.type.targetClass || 'String';
        if (isNull) {
          return `${rawAccess} != null ? ${enumName}.values.firstWhere((e) => e.name == ${rawAccess}) : null`;
        }
        return `${enumName}.values.firstWhere((e) => e.name == ${rawAccess})`;
      case 'array':
        const listCast = `json['${prop.name}'] as List?`;
        const innerType = prop.type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false };
        if (innerType.kind === 'object') {
          const mapCall = `.map((e) => ${innerType.targetClass}.fromJson(e)).toList()`;
          if (isNull) {
            return `(${listCast})?${mapCall}`;
          }
          return `(${listCast} ?? [])${mapCall}`;
        } else if (innerType.kind === 'primitive') {
          const dartType = this.mapType(innerType, { isNullableEnabled: false });
          if (isNull) {
            return `${rawAccess} != null ? List<${dartType}>.from(${rawAccess}) : null`;
          }
          return `List<${dartType}>.from(${rawAccess} ?? [])`;
        }
        return `List.from(${rawAccess} ?? [])`;
      default:
        return rawAccess;
    }
  }

  private mapType(type: TypeNode, options: GeneratorOptions): string {
    switch (type.kind) {
      case 'primitive':
        if (type.primitiveType === 'string') return 'String';
        if (type.primitiveType === 'number') return 'num';
        if (type.primitiveType === 'boolean') return 'bool';
        return 'dynamic';
      case 'object':
        return type.targetClass || 'dynamic';
      case 'array':
        const innerType = this.mapType(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false }, options);
        return `List<${innerType}>`;
      case 'enum':
        return type.targetClass || 'String';
      case 'date':
        return 'DateTime';
      case 'null':
        return 'dynamic';
      default:
        return 'dynamic';
    }
  }

  private toEnumKey(val: string): string {
    if (!val) return 'unknown';
    // camelCase for Dart enums
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
