// Native downloads remain the default assertion in CI. Some managed Windows
// environments cancel browser downloads; explicitly opt into checking the actual
// exported Blob there, rather than pretending a file was downloaded successfully.
exports.capture=async page=>{if(process.env.TEST_BLOB_EXPORT==='1')await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.lastExportBlob=blob;return create(blob);};});};
exports.text=async(page,download)=>{
 if(process.env.TEST_BLOB_EXPORT==='1'){console.log('EXPORT CHECK: Blob content (native download not asserted in this environment)');return page.evaluate(()=>window.lastExportBlob.text());}
 return require('node:fs').readFileSync(await download.path(),'utf8');
};
