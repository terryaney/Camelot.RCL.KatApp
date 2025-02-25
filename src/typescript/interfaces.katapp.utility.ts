interface IStringIndexer<T> extends Record<string, T> { }
interface IStringAnyIndexer extends IStringIndexer<any> { } // eslint-disable-line @typescript-eslint/no-explicit-any
interface IStringAnyIndexerReplacer {
	(this: any, key: string, value: any): any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
