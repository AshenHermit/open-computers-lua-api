process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('request');
var fs = require('fs');
const { ApiProvider, ApiNamespace, ApiMethod } = require('./apiProvider');

var Xray = require('x-ray');
const { mod, getServerFromUrl } = require('./utils');
var xray = Xray()

function readApiPagesList(){
    var pagesListText = fs.readFileSync(__dirname+"/api_pages.list", "utf-8")
    var pagesList = pagesListText.replace(/\r/g, "").split("\n").filter(x=>x.trim())
    return pagesList
}

const apiDocUrls = readApiPagesList()

class OCDocApiProvider extends ApiProvider{
    constructor(){
        super()
    }
    /**
     * 
     * @returns {Promise<Array<ApiNamespace>>}
     */
    async getNamespaces(){
        var urls = Array.from(apiDocUrls)
        /**@type {Array<ApiNamespace>} */
        var namespaces = []
        for (let i = 0; i < urls.length; i++) {
            var url = urls[i]
            var nspace = await this.requestNamespaceFromApiPage(url)
            namespaces.push(nspace)
        }
        return namespaces
    }

    /**
     * @param {String} text
     */
    cleanMDDoc(text, url=""){
        var serverName = getServerFromUrl(url)
        text = text.replace(/\r/g, "")
        var docEnd = Math.min(
            mod(text.indexOf("\n\nContents"),  999999999),
            text.length,
        )
        text = text.substring(0, docEnd)
        text = text.replace(/\[\[(http[^\|]+)\|([^\]]+)\]\]/g, "[$2]($1)")
        text = text.replace(/\[\[([^\|]+)\|([^\]]+)\]\]/g, "[$2](https://"+serverName+"/$1)")
        return text
    }

    /**
     * 
     * @param {String} params 
     * @returns {String}
     */
    normalizeMethodParameters(params){
        params = params.replace(/or/g, "|")
        // params = params.replace(/\[,\s?([_\w][_\w\d]+)(\s|\[|\])/g, ", $1?$2")
        // params = params.replace(/\[,/g, ",")
        // params = params.replace(/\],/g, ",")
        if(params.charAt(0)=="[") params = params.substr(1)
        if(params.charAt(params.length-1)=="]") params = params.substr(0, params.length-1)
        return params
    }

    extractMethod(definition, mdText, difinitionMatch){
        // \(([^\)]+)\)
        // /\s*([^`\(]+)\s*\(([^`\)]*)\)\:\s*([^`]+)/gim
        var difinitionEnd = difinitionMatch.index + difinitionMatch[0].length

        var partsRegex = /\s*([^`\(]+)\s*\(([^`\)]*)\)(\:\s*([^`]+))?/gim
        var parts = partsRegex.exec(definition)
        if(parts){
            var method = new ApiMethod()
            try{
                var nameParts = parts[1].split(".")
                method.name = nameParts[nameParts.length-1]
                method.parameters = this.normalizeMethodParameters(parts[2])
                method.returnType = parts[4]

                var docEnd = Math.min(
                    mod(mdText.indexOf("- `", difinitionEnd), 999999999),
                    mod(mdText.indexOf("\n\nContents", difinitionEnd),  999999999),
                    mdText.length,
                )
                method.documentation = mdText.substring(difinitionEnd, docEnd)
                method.documentation = method.documentation.trim()
                return method
            }catch(e){
                console.error(e)
            }
        }else{
            return null
        }
    }
    
    /**
     * @param {String} mdText
     * @returns {Promise<ApiNamespace>}*/
    async readNamespaceFromMD(mdText, namespaceName="", url=""){
        mdText = this.cleanMDDoc(mdText, url)
        var regex = /- `([^`]+)`/gim
        var methods = []
        while(true){
            var match = regex.exec(mdText)
            if(!match) break
            var definition = match[1]
            var method = this.extractMethod(definition, mdText, match)
            if(method){
                methods.push(method)
            }
        }
        var nspace = new ApiNamespace()
        nspace.name = namespaceName
        nspace.documentation = mdText
        nspace.children = methods
        return nspace
    }

    /**@returns {String}*/
    getDocPageSourceUrl(url){
        if(url.indexOf("?")!=-1) url+="&"
        else url+="?"
        url += "do=edit"
        return url
    }

    /**@returns {Promise<String>} */
    async getMDTextFromPage(html){
        var text = await xray(html, "#wiki__text@html")
        return text
    }

    /**@returns {Promise<String>} */
    async requestMDDocPage(url){
        return new Promise((resolve, reject)=>{
            url = this.getDocPageSourceUrl(url)
            request({
                    url: url,
                    method: 'GET',
                    agentOptions: {
                        rejectUnauthorized: false
                    }
                },
                (async function (err, resp, body) {
                    if(err){
                        reject(err)
                        return
                    }
                    var mdText = await this.getMDTextFromPage(body)
                    resolve(mdText)
                }).bind(this)
            );
        })
    }

    getNamespaceNameFromUrl(apiUrl){
        var start = apiUrl.lastIndexOf(":")+1
        var end = apiUrl.lastIndexOf("?")
        if(end==-1) end = apiUrl.length
        return apiUrl.substring(start, end)
    }   

    /**@returns {Promise<ApiNamespace>} */
    async requestNamespaceFromApiPage(url){
        console.log(`loading namespaces from page "${url}"`)
        var mdText = await this.requestMDDocPage(url)
        var namespace = await this.readNamespaceFromMD(mdText, 
            this.getNamespaceNameFromUrl(url), url)
        return namespace
    }
}

// var provider = new OCDocApiProvider()
// provider.getNamespaces().then(namespaces=>{
//     console.log(namespaces)
//     fs.writeFileSync("C:/Users/user/Downloads/doc.json", JSON.stringify(namespaces, null, 2))
// })

module.exports.OCDocApiProvider = OCDocApiProvider


