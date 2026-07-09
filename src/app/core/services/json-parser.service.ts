import { Injectable } from '@angular/core';
import { TypeNode, PropertyNode } from '../../shared/models/property.model';
import { ClassNode, ModelTree } from '../../shared/models/class.model';

@Injectable({
  providedIn: 'root'
})
export class JSONParserService {
  private classesList: ClassNode[] = [];
  private classNamesSet = new Set<string>();

  constructor() {}

  /**
   * Helper to convert snake_case, kebab-case, or spaces to camelCase
   */
  public toCamelCase(str: string): string {
    // Keep it alphanumeric, handle transitions
    const clean = str.replace(/[^a-zA-Z0-9]+/g, '_');
    return clean
      .split('_')
      .filter(x => x.length > 0)
      .map((word, idx) => {
        if (idx === 0) {
          return word.charAt(0).toLowerCase() + word.slice(1);
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * Helper to sanitize a key name to be a valid identifier while preserving JSON casing
   */
  public toSafeNamePreservingCase(str: string): string {
    if (!str) return 'variable';
    let clean = str.replace(/[^a-zA-Z0-9_]/g, '_');
    clean = clean.replace(/__+/g, '_');
    if (/^[0-9]/.test(clean)) {
      clean = '_' + clean;
    }
    if (!clean || /^_+$/.test(clean)) {
      clean = 'field_' + (clean || 'value');
    }
    const keywords = new Set([
      'class', 'interface', 'struct', 'enum', 'import', 'export', 'public', 'private', 'protected',
      'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
      'case', 'break', 'continue', 'new', 'this', 'super', 'default', 'package', 'package-private',
      'func', 'type', 'defer', 'go', 'map', 'chan', 'select', 'fallthrough',
      'fn', 'impl', 'pub', 'use', 'mod', 'trait', 'as', 'in', 'is', 'not', 'and', 'or', 'lambda',
      'def', 'del', 'elif', 'except', 'finally', 'from', 'global', 'nonlocal', 'pass', 'raise',
      'try', 'with', 'yield', 'assert', 'async', 'await'
    ]);
    if (keywords.has(clean.toLowerCase())) {
      clean = '_' + clean;
    }
    return clean;
  }

  /**
   * Helper to convert string to PascalCase
   */
  public toPascalCase(str: string): string {
    const camel = this.toCamelCase(str);
    if (!camel) return 'Root';
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  /**
   * Quick heuristic to singularize plural names
   */
  public singularize(str: string): string {
    if (str.endsWith('ies')) {
      return str.slice(0, -3) + 'y';
    }
    // E.g. "addresses" -> "address"
    if (str.endsWith('esses') || str.endsWith('asses') || str.endsWith('ushes') || str.endsWith('oxes')) {
      return str.slice(0, -2);
    }
    if (str.endsWith('es') && !str.endsWith('ees') && !str.endsWith('oes')) {
      return str.slice(0, -2);
    }
    if (str.endsWith('s') && !str.endsWith('ss') && !str.endsWith('us') && !str.endsWith('is')) {
      return str.slice(0, -1);
    }
    return str;
  }

  /**
   * Helper to resolve class name conflicts by adding suffixes if structure differs
   */
  private getUniqueClassName(baseName: string, properties: PropertyNode[], isEnum = false, enumValues?: string[]): string {
    let candidateName = this.toPascalCase(baseName);
    
    // Check if there is already a class with this name
    const existing = this.classesList.find(c => c.name === candidateName);
    if (!existing) {
      this.classNamesSet.add(candidateName);
      return candidateName;
    }

    // Check if the structure is the same. If so, reuse the class name!
    if (isEnum && existing.isEnum && enumValues) {
      const match = existing.enumValues && 
        existing.enumValues.length === enumValues.length && 
        enumValues.every(val => existing.enumValues?.includes(val));
      if (match) {
        return candidateName;
      }
    } else if (!isEnum && !existing.isEnum) {
      const match = this.arePropertiesEqual(existing.properties, properties);
      if (match) {
        return candidateName;
      }
    }

    // If structure differs, create a unique name by appending numbers or parent qualifiers
    let count = 2;
    while (this.classNamesSet.has(`${candidateName}${count}`)) {
      count++;
    }
    const finalName = `${candidateName}${count}`;
    this.classNamesSet.add(finalName);
    return finalName;
  }

  private arePropertiesEqual(props1: PropertyNode[], props2: PropertyNode[]): boolean {
    if (props1.length !== props2.length) return false;
    // Simple verification
    const map1 = new Map(props1.map(p => [p.safeName, this.getTypeString(p.type)]));
    for (const p2 of props2) {
      const t1 = map1.get(p2.safeName);
      if (!t1 || t1 !== this.getTypeString(p2.type)) {
        return false;
      }
    }
    return true;
  }

  private getTypeString(type: TypeNode): string {
    if (type.kind === 'primitive') return type.primitiveType || 'any';
    if (type.kind === 'object') return type.targetClass || 'object';
    if (type.kind === 'array') return `${this.getTypeString(type.arrayElementType || { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false })}[]`;
    if (type.kind === 'enum') return type.targetClass || 'enum';
    if (type.kind === 'date') return 'Date';
    return 'any';
  }

  /**
   * Validates if string is valid in the selected format.
   * Returns a friendly syntax error message if invalid, otherwise null.
   */
  public validateInput(inputStr: string, format: string): string | null {
    if (!inputStr.trim()) {
      return `❌ Input is empty`;
    }

    if (format === 'json') {
      try {
        JSON.parse(inputStr);
        return null;
      } catch (err: any) {
        const msg = err.message || '';
        const match = msg.match(/at position (\d+)/);
        if (match) {
          const pos = parseInt(match[1], 10);
          let line = 1;
          let col = 1;
          for (let i = 0; i < Math.min(pos, inputStr.length); i++) {
            if (inputStr[i] === '\n') {
              line++;
              col = 1;
            } else {
              col++;
            }
          }
          return `❌ Invalid JSON: ${msg.replace(/ at position \d+/, '')} at line ${line}, column ${col}`;
        }
        return `❌ Invalid JSON: ${msg}`;
      }
    }

    if (format === 'xml') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(inputStr, "application/xml");
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          return `❌ Invalid XML: ${parserError.textContent}`;
        }
        return null;
      } catch (err: any) {
        return `❌ Invalid XML: ${err.message}`;
      }
    }

    if (format === 'yaml') {
      try {
        this.parseYAML(inputStr);
        return null;
      } catch (err: any) {
        return `❌ Invalid YAML: ${err.message}`;
      }
    }

    if (format === 'csv') {
      try {
        this.parseCSV(inputStr);
        return null;
      } catch (err: any) {
        return `❌ Invalid CSV: ${err.message}`;
      }
    }

    // Code formats (TypeScript, C#, Java, etc.)
    if (['typescript', 'csharp', 'java', 'kotlin', 'dart', 'swift', 'go', 'python'].includes(format)) {
      const hasClass = /class|interface|struct|record/i.test(inputStr);
      if (!hasClass) {
        return `⚠️ No class, interface, or struct declaration detected in input code.`;
      }
      return null;
    }

    return null;
  }

  /**
   * Formats a string to a pretty layout based on format
   */
  public prettyPrint(inputStr: string, format: string): string {
    if (format === 'json') {
      try {
        const obj = JSON.parse(inputStr);
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return inputStr;
      }
    }

    if (format === 'xml') {
      try {
        return this.prettyPrintXML(inputStr);
      } catch (e) {
        return inputStr;
      }
    }

    return inputStr; // Keep other as is
  }

  private prettyPrintXML(xmlStr: string): string {
    let formatted = '';
    let reg = /(>)(<)(\/*)/g;
    let xml = xmlStr.replace(reg, '$1\r\n$2$3');
    let pad = 0;
    xml.split('\r\n').forEach((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      let padding = '';
      for (let i = 0; i < pad; i++) {
        padding += '  ';
      }

      formatted += padding + node + '\r\n';
      pad += indent;
    });
    return formatted.trim();
  }

  /**
   * Parse input string based on format and build ModelTree
   */
  public parse(inputStr: string, format: string = 'json'): ModelTree {
    this.classesList = [];
    this.classNamesSet.clear();

    if (['typescript', 'csharp', 'java', 'kotlin', 'dart', 'swift', 'go', 'python'].includes(format)) {
      return this.parseCodeModel(inputStr);
    }

    let rootValue: any;
    if (format === 'json') {
      rootValue = JSON.parse(inputStr);
    } else if (format === 'xml') {
      rootValue = this.parseXML(inputStr);
    } else if (format === 'yaml') {
      rootValue = this.parseYAML(inputStr);
    } else if (format === 'csv') {
      rootValue = this.parseCSV(inputStr);
    }

    const rootType = this.inferType(rootValue, 'Root', 'Root');

    // Remove duplicates from classesList
    const uniqueClasses: ClassNode[] = [];
    const seenNames = new Set<string>();
    
    for (const c of this.classesList) {
      if (!seenNames.has(c.name)) {
        seenNames.add(c.name);
        uniqueClasses.push(c);
      }
    }

    return {
      classes: uniqueClasses,
      rootType
    };
  }

  /**
   * Parse programming language code structure to extract models
   */
  private parseCodeModel(codeStr: string): ModelTree {
    this.classesList = [];
    this.classNamesSet.clear();

    // Match class, interface, struct, or record definitions
    const classRegex = /(?:class|interface|struct|record)\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    let rootClass: ClassNode | null = null;

    while ((match = classRegex.exec(codeStr)) !== null) {
      const className = match[1];
      const body = match[2];
      const properties: PropertyNode[] = [];

      const lines = body.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

        let name = '';
        let rawType = 'any';
        let isOptional = false;

        // Pattern 1: TS style "id?: number"
        const tsMatch = line.match(/^(\w+)(\?)?\s*:\s*([^;=]+)/);
        if (tsMatch) {
          name = tsMatch[1];
          isOptional = tsMatch[2] === '?';
          rawType = tsMatch[3].trim();
        } else {
          // Pattern 2: C#/Java/Go style "[mod] Type name [stuff]"
          if (line.startsWith('[') || line.startsWith('@')) continue;
          const words = line.replace(/[;{}]/g, '').split(/\s+/);
          
          if (words.length >= 2) {
            const getSetIdx = words.indexOf('get');
            const cleanWords = getSetIdx !== -1 ? words.slice(0, getSetIdx) : words;
            if (cleanWords.length >= 2) {
              name = cleanWords[cleanWords.length - 1];
              rawType = cleanWords[cleanWords.length - 2];
              
              if (name === 'set' || name === 'get' || name === 'final' || name === 'const' || name === 'readonly') {
                continue;
              }
            }
          }
        }

        if (name && rawType && name !== 'class' && name !== 'interface') {
          const inferredType = this.mapCodeTypeToTypeNode(rawType);
          inferredType.isOptional = isOptional;
          
          properties.push({
            name: name,
            safeName: this.toSafeNamePreservingCase(name),
            type: inferredType
          });
        }
      }

      if (properties.length > 0) {
        const clsName = this.toPascalCase(className);
        const classNode: ClassNode = {
          name: clsName,
          properties
        };
        this.classesList.push(classNode);
        if (!rootClass) {
          rootClass = classNode;
        }
      }
    }

    if (!rootClass) {
      throw new Error("Could not detect any class, interface, or struct structures in the input code.");
    }

    return {
      classes: this.classesList,
      rootType: {
        kind: 'object',
        targetClass: rootClass.name,
        isNullable: false,
        isOptional: false
      }
    };
  }

  private mapCodeTypeToTypeNode(rawType: string): TypeNode {
    const t = rawType.toLowerCase().replace(/[?]/g, '');
    const isNullable = rawType.includes('?');

    if (t === 'string' || t === 'str' || t.includes('char')) {
      return { kind: 'primitive', primitiveType: 'string', isNullable, isOptional: false };
    }
    if (t === 'number' || t === 'int' || t === 'double' || t === 'float' || t === 'num' || t === 'integer' || t === 'long') {
      return { kind: 'primitive', primitiveType: 'number', isNullable, isOptional: false };
    }
    if (t === 'boolean' || t === 'bool') {
      return { kind: 'primitive', primitiveType: 'boolean', isNullable, isOptional: false };
    }
    if (t === 'date' || t === 'datetime' || t === 'time') {
      return { kind: 'date', isNullable, isOptional: false };
    }
    if (t.includes('list') || t.includes('[]') || t.includes('array')) {
      const genericMatch = rawType.match(/<([^>]+)>/);
      const innerRaw = genericMatch ? genericMatch[1] : 'any';
      return {
        kind: 'array',
        arrayElementType: this.mapCodeTypeToTypeNode(innerRaw),
        isNullable,
        isOptional: false
      };
    }

    return {
      kind: 'object',
      targetClass: this.toPascalCase(rawType),
      isNullable,
      isOptional: false
    };
  }

  // --- Multi-Format Custom Parsers ---

  private parseXML(xmlStr: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error(parserError.textContent || "XML parsing error");
    }
    return this.xmlToObj(xmlDoc.documentElement);
  }

  private xmlToObj(node: Element): any {
    const obj: any = {};
    
    if (node.children.length === 0) {
      const val = node.textContent?.trim() || "";
      if (val === "true") return true;
      if (val === "false") return false;
      if (!isNaN(Number(val)) && val !== "") return Number(val);
      return val;
    }

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const name = child.tagName;
      const value = this.xmlToObj(child);
      
      if (obj[name] !== undefined) {
        if (!Array.isArray(obj[name])) {
          obj[name] = [obj[name]];
        }
        obj[name].push(value);
      } else {
        obj[name] = value;
      }
    }
    return obj;
  }

  private parseYAML(yamlStr: string): any {
    const lines = yamlStr.split('\n');
    const root: any = {};
    const stack: { indent: number; obj: any; key: string | null }[] = [{ indent: -1, obj: root, key: null }];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        if (trimmed.startsWith('-')) {
          const listVal = trimmed.slice(1).trim();
          while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
          }
          const parent = stack[stack.length - 1];
          if (parent.key) {
            if (!Array.isArray(parent.obj[parent.key])) {
              parent.obj[parent.key] = [];
            }
            parent.obj[parent.key].push(this.parsePrimitiveValue(listVal));
          }
        }
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim();
      const rawVal = trimmed.slice(colonIndex + 1).trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      
      if (rawVal === '') {
        const newObj = {};
        if (Array.isArray(parent.obj)) {
          parent.obj.push(newObj);
        } else {
          parent.obj[key] = newObj;
        }
        stack.push({ indent, obj: newObj, key });
      } else {
        const parsedVal = this.parsePrimitiveValue(rawVal);
        if (Array.isArray(parent.obj)) {
          parent.obj.push({ [key]: parsedVal });
        } else {
          parent.obj[key] = parsedVal;
        }
      }
    }
    return root;
  }

  private parseCSV(csvStr: string): any {
    const lines = csvStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must have a header line and at least one data line.');
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(r => r.trim().replace(/^["']|["']$/g, ''));
      const obj: any = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const val = row[j] !== undefined ? row[j] : '';
        obj[header] = this.parsePrimitiveValue(val);
      }
      result.push(obj);
    }
    return result;
  }

  private parsePrimitiveValue(val: string): any {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    if (!isNaN(Number(val)) && val !== '') return Number(val);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      return val.slice(1, -1);
    }
    return val;
  }

  /**
   * Infer TypeNode from any JS value
   */
  private inferType(value: any, keyName: string, parentClassName: string): TypeNode {
    const isNullable = value === null;
    const isOptional = false;

    if (value === null || value === undefined) {
      return { kind: 'null', isNullable: true, isOptional: false };
    }

    const valType = typeof value;

    if (valType === 'boolean') {
      return { kind: 'primitive', primitiveType: 'boolean', isNullable, isOptional };
    }

    if (valType === 'number') {
      return { kind: 'primitive', primitiveType: 'number', isNullable, isOptional };
    }

    if (valType === 'string') {
      // Check if it's an ISO date string
      // e.g. "2026-07-05T15:41:27Z"
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
      if (dateRegex.test(value) && !isNaN(Date.parse(value))) {
        return { kind: 'date', isNullable, isOptional };
      }
      return { kind: 'primitive', primitiveType: 'string', isNullable, isOptional };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return {
          kind: 'array',
          arrayElementType: { kind: 'primitive', primitiveType: 'any', isNullable: false, isOptional: false },
          isNullable,
          isOptional
        };
      }

      // Check if all array elements are strings, and if there are repeated values
      const allStrings = value.every(item => typeof item === 'string');
      if (allStrings && value.length > 1) {
        const uniqueValues = Array.from(new Set(value as string[]));
        // If we have repeats or if it is a list of statuses, suggest an enum
        const hasRepeats = uniqueValues.length < value.length;
        // Let's create an enum class if it makes sense (repeats or short lists)
        if (hasRepeats || uniqueValues.length <= 5) {
          const enumClassName = this.getUniqueClassName(this.singularize(keyName) + 'Enum', [], true, uniqueValues);
          
          // Verify if it's already added
          const alreadyExists = this.classesList.find(c => c.name === enumClassName);
          if (!alreadyExists) {
            this.classesList.push({
              name: enumClassName,
              properties: [],
              isEnum: true,
              enumValues: uniqueValues
            });
          }

          return {
            kind: 'array',
            arrayElementType: { kind: 'enum', targetClass: enumClassName, isNullable: false, isOptional: false },
            isNullable,
            isOptional
          };
        }
      }

      // Determine element types of array
      // If it contains objects, we need to merge their schemas
      const allObjects = value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
      if (allObjects) {
        const singularName = this.singularize(this.toPascalCase(keyName));
        const mergedClass = this.mergeObjectSchemas(value, singularName);
        
        return {
          kind: 'array',
          arrayElementType: { kind: 'object', targetClass: mergedClass.name, isNullable: false, isOptional: false },
          isNullable,
          isOptional
        };
      }

      // Fallback: take the first item's type, or merge primitive types
      const firstItem = value[0];
      const elementType = this.inferType(firstItem, this.singularize(keyName), parentClassName);
      
      return {
        kind: 'array',
        arrayElementType: elementType,
        isNullable,
        isOptional
      };
    }

    if (valType === 'object') {
      // Create a class node
      const className = this.toPascalCase(keyName);
      const properties: PropertyNode[] = [];

      for (const k of Object.keys(value)) {
        const val = value[k];
        const propType = this.inferType(val, k, className);
        properties.push({
          name: k,
          safeName: this.toSafeNamePreservingCase(k),
          type: propType
        });
      }

      const uniqueClassName = this.getUniqueClassName(className, properties);
      
      const alreadyExists = this.classesList.find(c => c.name === uniqueClassName);
      if (!alreadyExists) {
        this.classesList.push({
          name: uniqueClassName,
          properties
        });
      }

      return {
        kind: 'object',
        targetClass: uniqueClassName,
        isNullable,
        isOptional
      };
    }

    return { kind: 'primitive', primitiveType: 'any', isNullable, isOptional };
  }

  /**
   * Merge schemas of objects inside an array
   */
  private mergeObjectSchemas(objects: any[], baseClassName: string): ClassNode {
    const allKeys = new Set<string>();
    for (const obj of objects) {
      if (obj) {
        Object.keys(obj).forEach(k => allKeys.add(k));
      }
    }

    const properties: PropertyNode[] = [];

    for (const key of allKeys) {
      const values = objects.map(o => o?.[key]).filter(v => v !== undefined);
      const isOptional = objects.some(o => o === null || o === undefined || o[key] === undefined);
      const isNullable = objects.some(o => o?.[key] === null);

      // Merge types of all encountered values for this key
      let mergedType: TypeNode;

      if (values.length === 0) {
        mergedType = { kind: 'primitive', primitiveType: 'any', isNullable: true, isOptional };
      } else {
        // Let's analyze all types
        const types = values.map(v => this.inferType(v, key, baseClassName));
        mergedType = this.combineTypes(types, key, baseClassName);
        mergedType.isOptional = isOptional;
        mergedType.isNullable = mergedType.isNullable || isNullable;
      }

      properties.push({
        name: key,
        safeName: this.toSafeNamePreservingCase(key),
        type: mergedType
      });
    }

    const uniqueClassName = this.getUniqueClassName(baseClassName, properties);

    const existingClassIdx = this.classesList.findIndex(c => c.name === uniqueClassName);
    const newClass: ClassNode = {
      name: uniqueClassName,
      properties
    };

    if (existingClassIdx >= 0) {
      // Merge with existing properties
      const existing = this.classesList[existingClassIdx];
      // Combine them
      const mergedProps = this.mergePropertiesList(existing.properties, properties, baseClassName);
      this.classesList[existingClassIdx] = {
        ...existing,
        properties: mergedProps
      };
    } else {
      this.classesList.push(newClass);
    }

    return newClass;
  }

  private mergePropertiesList(p1: PropertyNode[], p2: PropertyNode[], parentClass: string): PropertyNode[] {
    const map = new Map<string, PropertyNode>();
    p1.forEach(p => map.set(p.name, p));

    for (const p of p2) {
      const orig = map.get(p.name);
      if (orig) {
        const combinedType = this.combineTypes([orig.type, p.type], p.name, parentClass);
        map.set(p.name, {
          ...orig,
          type: combinedType
        });
      } else {
        // New property from the other schema
        map.set(p.name, {
          ...p,
          type: {
            ...p.type,
            isOptional: true
          }
        });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Combine two or more TypeNodes into a single TypeNode
   */
  private combineTypes(types: TypeNode[], keyName: string, parentClassName: string): TypeNode {
    if (types.length === 1) return { ...types[0] };

    const first = types[0];
    const isNullable = types.some(t => t.isNullable || t.kind === 'null');
    const isOptional = types.some(t => t.isOptional);

    // Filter out null types for details analysis
    const nonNullTypes = types.filter(t => t.kind !== 'null');
    if (nonNullTypes.length === 0) {
      return { kind: 'null', isNullable: true, isOptional };
    }

    const firstNonNull = nonNullTypes[0];

    // If they all have the same kind, combine details
    const allSameKind = nonNullTypes.every(t => t.kind === firstNonNull.kind);
    if (allSameKind) {
      if (firstNonNull.kind === 'primitive') {
        const allSamePrimitive = nonNullTypes.every(t => t.primitiveType === firstNonNull.primitiveType);
        if (allSamePrimitive) {
          return { kind: 'primitive', primitiveType: firstNonNull.primitiveType, isNullable, isOptional };
        }
        return { kind: 'primitive', primitiveType: 'any', isNullable, isOptional };
      }

      if (firstNonNull.kind === 'object') {
        const allSameClass = nonNullTypes.every(t => t.targetClass === firstNonNull.targetClass);
        if (allSameClass) {
          return { kind: 'object', targetClass: firstNonNull.targetClass, isNullable, isOptional };
        }
        // If they are different object names but both are objects, we might fallback to the first or merge.
        // For simplicity, reuse the first non-null class ref or general object
        return { kind: 'object', targetClass: firstNonNull.targetClass || 'any', isNullable, isOptional };
      }

      if (firstNonNull.kind === 'array') {
        const elementTypes = nonNullTypes.map(t => t.arrayElementType).filter((t): t is TypeNode => !!t);
        const combinedElement = this.combineTypes(elementTypes, keyName, parentClassName);
        return {
          kind: 'array',
          arrayElementType: combinedElement,
          isNullable,
          isOptional
        };
      }

      if (firstNonNull.kind === 'enum') {
        const allSameClass = nonNullTypes.every(t => t.targetClass === firstNonNull.targetClass);
        if (allSameClass) {
          return { kind: 'enum', targetClass: firstNonNull.targetClass, isNullable, isOptional };
        }
        return { kind: 'primitive', primitiveType: 'string', isNullable, isOptional };
      }

      if (firstNonNull.kind === 'date') {
        return { kind: 'date', isNullable, isOptional };
      }
    }

    // Mixed types (e.g. some numbers, some strings) -> fallback to 'any'
    return { kind: 'primitive', primitiveType: 'any', isNullable, isOptional };
  }
}
