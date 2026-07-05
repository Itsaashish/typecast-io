import { PropertyNode, TypeNode } from './property.model';

export interface ClassNode {
  name: string; // PascalCase class name (e.g. "CustomerDetails")
  properties: PropertyNode[];
  isEnum?: boolean;
  enumValues?: string[];
}

export interface ModelTree {
  classes: ClassNode[];
  rootType: TypeNode;
}
