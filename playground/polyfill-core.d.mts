export type Base64Alphabet = "base64" | "base64url";

export type LastChunkHandling = "loose" | "strict" | "stop-before-partial";

export type Base64EncodingOptions = {
	/** Default: `"base64"` */
	alphabet?: Base64Alphabet | undefined;
};

export type Base64DecodingOptions = {
	/** Default: `"base64"` */
	alphabet?: Base64Alphabet | undefined;
	/** Default: `"loose"` */
	lastChunkHandling?: LastChunkHandling | undefined;
};

export declare function checkUint8Array(
	arg: unknown,
): asserts arg is Uint8Array;

export declare function uint8ArrayToBase64(
	arr: ArrayLike<number>,
	options?: Base64EncodingOptions | undefined,
): string;

export declare function base64ToUint8Array(
	string: string,
	options?: Base64DecodingOptions | undefined,
	into?: Uint8Array | undefined,
): Uint8Array;

export declare function uint8ArrayToHex(arr: ArrayLike<number>): string;

export declare function hexToUint8Array(
	string: string,
	into?: Uint8Array | undefined,
): Uint8Array;
