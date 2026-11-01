/** Copy a wire value, sorting the tag lists of every or_set it contains. */
export declare function canonicalize<T = any>(node: T): T;
/** Write a wire value in the canonical layout, with a trailing newline. */
export declare function emitCanonical(node: any): string;
