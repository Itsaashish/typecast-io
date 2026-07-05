export interface TypeNode {
  kind: 'primitive' | 'object' | 'array' | 'enum' | 'date' | 'null';
  primitiveType?: 'string' | 'number' | 'boolean' | 'any';
  targetClass?: string;       // Name of reference ClassNode (e.g. "CustomerDetails" or "Status")
  arrayElementType?: TypeNode; // For arrays
  enumValues?: string[];       // For enums (if inline or referenced)
  isNullable: boolean;
  isOptional: boolean;
}

export interface PropertyNode {
  name: string;      // Raw key in JSON (e.g. "created_at")
  safeName: string;  // camelCase key (e.g. "createdAt")
  type: TypeNode;
}
