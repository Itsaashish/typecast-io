import { ModelTree } from '../../shared/models/class.model';

export interface GeneratorOptions {
  isNullableEnabled: boolean;
  rootName?: string;
}

export abstract class BaseGenerator {
  abstract languageId: string;
  abstract displayName: string;
  abstract defaultFileName: string;
  
  /**
   * Generates model code from intermediate tree
   */
  abstract generate(modelTree: ModelTree, options: GeneratorOptions): string;
}
