import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/get-catalog-04-saiC6.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getCatalog_createServerFn_handler = createServerRpc({
	id: "1694116c1d8fc9956879cdccc6ec90b9031a50c881637cf210aa4a7f3ce2778f",
	name: "getCatalog",
	filename: "src/lib/catalog/get-catalog.ts"
}, (opts) => getCatalog.__executeServer(opts));
var getCatalog = createServerFn({ method: "POST" }).handler(getCatalog_createServerFn_handler, async () => {
	const { loadCatalog } = await import("./fetch.server-DFzvfJGE.mjs");
	return loadCatalog();
});
//#endregion
export { getCatalog_createServerFn_handler };
