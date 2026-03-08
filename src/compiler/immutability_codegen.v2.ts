/**
 * FreeLang v2.39 - @immutable Annotation Compiler Patch
 * Emit rt_cow_copy() on structural mutations
 */

import * as ts from 'typescript';

export interface ImmutableStructDef {
    name: string;
    fields: Map<string, string>;
    isCompiled: boolean;
}

export class ImmutabilityCodegen {
    private immutableStructs = new Map<string, ImmutableStructDef>();
    private emittedCalls = new Set<string>();

    /**
     * Parse @immutable annotation from AST
     */
    parseImmutableAnnotation(node: any): boolean {
        if (!node.decorators) return false;

        for (const decorator of node.decorators) {
            const text = this.getDecoratorText(decorator);
            if (text === '@immutable') {
                return true;
            }
        }
        return false;
    }

    private getDecoratorText(decorator: any): string {
        if (decorator.expression && decorator.expression.escapedText) {
            return '@' + decorator.expression.escapedText;
        }
        return '';
    }

    /**
     * Register struct as immutable
     */
    registerImmutableStruct(name: string, fields: Map<string, string>): void {
        this.immutableStructs.set(name, {
            name,
            fields,
            isCompiled: false
        });
    }

    /**
     * Emit COW assignment IR
     * On mutation: dst = rt_cow_copy(src)
     */
    emitCowAssignment(
        structName: string,
        fieldName: string,
        sourceVar: string,
        destVar: string
    ): string[] {
        const key = `${structName}.${fieldName}`;

        if (this.immutableStructs.has(structName) && !this.emittedCalls.has(key)) {
            this.emittedCalls.add(key);

            return [
                `// @immutable assignment: ${structName}.${fieldName}`,
                `let ${destVar}_shadow = rt_cow_alloc(sizeof(${structName}));`,
                `rt_cow_set(${destVar}_shadow, 0, sizeof(${structName}), &${sourceVar});`,
                `let ${destVar} = rt_cow_copy(${destVar}_shadow);`,
                `rt_cow_set(${destVar}, offsetof(${structName}, ${fieldName}), sizeof(${fieldName}_type), &new_value);`,
                `${destVar} = rt_cow_copy(${destVar}_shadow);`
            ];
        }

        return [
            `${destVar} = ${sourceVar};`
        ];
    }

    /**
     * Transform assignment: a.field = b
     * -> a_new = rt_cow_produce(a, (draft) => { draft.field = b })
     */
    transformStructMutation(node: any): string[] {
        const instructions: string[] = [];

        // Detect struct mutation pattern: obj.field = value
        if (node.kind === ts.SyntaxKind.BinaryExpression) {
            const binExpr = node as any;

            // Check if left side is struct field access
            if (binExpr.left.kind === ts.SyntaxKind.PropertyAccessExpression) {
                const propAccess = binExpr.left as any;
                const structName = propAccess.expression.escapedText;
                const fieldName = propAccess.name.escapedText;

                if (this.immutableStructs.has(structName)) {
                    const tempVar = `${structName}_prod_${Date.now()}`;

                    instructions.push(
                        `// Immutable struct mutation detected: ${structName}.${fieldName}`,
                        `let ${tempVar} = rt_cow_produce(${structName}, (draft) => {`,
                        `  draft.${fieldName} = ${this.exprToString(binExpr.right)};`,
                        `});`,
                        `${structName} = ${tempVar};`
                    );

                    return instructions;
                }
            }
        }

        return [];
    }

    private exprToString(expr: any): string {
        if (expr.escapedText) return expr.escapedText;
        if (expr.text) return expr.text;
        return 'value';
    }

    /**
     * Inject COW runtime init call at module top
     */
    injectCowInit(): string {
        return `rt_cow_init();`;
    }

    /**
     * Generate rt_cow_produce closure
     */
    generateProduceFunction(): string[] {
        return [
            `fn rt_cow_produce(original, producer) {`,
            `  let shadow = rt_cow_alloc(sizeof(original));`,
            `  rt_cow_set(shadow, 0, sizeof(original), &original);`,
            `  producer(shadow);`,
            `  return rt_cow_copy(shadow);`,
            `}`
        ];
    }

    /**
     * Check if struct is immutable
     */
    isImmutableStruct(name: string): boolean {
        return this.immutableStructs.has(name);
    }

    /**
     * Get all registered immutable structs
     */
    getImmutableStructs(): ImmutableStructDef[] {
        return Array.from(this.immutableStructs.values());
    }

    /**
     * Reset codegen state
     */
    reset(): void {
        this.emittedCalls.clear();
        this.immutableStructs.clear();
    }
}

/**
 * Main entry point: attach to Emitter phase
 */
export function patchEmitterWithImmutability(emitter: any): void {
    const codegen = new ImmutabilityCodegen();

    // Hook into emitAssignment
    const originalEmitAssignment = emitter.emitAssignment;
    emitter.emitAssignment = function(node: any, instructions: any[]) {
        // Check if target is @immutable struct
        if (node.left && node.left.kind === ts.SyntaxKind.Identifier) {
            const identName = node.left.escapedText;

            // Wrap with COW if immutable
            if (codegen.isImmutableStruct(identName)) {
                const cowInstructions = codegen.emitCowAssignment(
                    identName,
                    'field_name',
                    'source_value',
                    identName
                );
                instructions.push(...cowInstructions);
                return;
            }
        }

        // Fall back to original
        originalEmitAssignment.call(this, node, instructions);
    };

    // Inject COW init at module start
    const originalEmitModule = emitter.emitModule;
    emitter.emitModule = function(module: any) {
        const initInstr = codegen.injectCowInit();
        this.emit(initInstr);
        originalEmitModule.call(this, module);
    };
}
