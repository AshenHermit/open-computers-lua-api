const vscode = require("vscode")

class ApiElement{
    constructor(){
        this.name = ""
        this.documentation = ""
        this.type = "element"
    }
    /**
     * @returns {vscode.CompletionItem}
     */
    toCompletionItem(){
        var item = new vscode.CompletionItem(this.name)
        item.documentation = new vscode.MarkdownString(this.documentation)
        item.label = this.name
        item.insertText = this.name
        item.sortText = "~"+this.name
        item.preselect = true

        var kinds = {"method": vscode.CompletionItemKind.Method, "namespace": vscode.CompletionItemKind.Struct, }
        var defaultKind = vscode.CompletionItemKind.Field

        if(this.type in kinds) item.kind = kinds[this.type]
        else item.kind = defaultKind
        return item
    }
}

class ApiMethod extends ApiElement{
    constructor(){
        super()
        this.type = "method"
        this.parameters = ""
        this.returnType = ""
    }

    /**
     * @returns {String}
     */
    getDifinition(){
        return `${this.name}(${this.parameters}): ` + (this.returnType ? this.returnType : "void")
    }

    /**
     * @returns {vscode.CompletionItem}
     */
    toCompletionItem(){
        var item = super.toCompletionItem()
        var definition = this.getDifinition()
        item.detail = definition
        return item
    }

    getParametersSpans(offset=0){
        var params = this.parameters
        var breaks = []
        breaks.push(0)
        var balance = 0
        for(var i=0; i<params.length; i++){
            if(params.charAt(i)=="[") balance+=1
            if(params.charAt(i)=="]") balance-=1
            if(params.substr(i, 2)==", " && balance==0) breaks.push(i)
        }
        breaks.push(params.length)
        var spans = []
        
        for(var i=0; i<breaks.length-1; i++){
            breaks[i] = breaks[i]+params.substring(breaks[i], breaks[i+1]).match(/[_\w]/).index
            spans.push([breaks[i]+offset, breaks[i+1]+offset])
        }
        return spans
    }

    /**
     * @param {Number} activeParameter
     * @returns {vscode.SignatureHelp}
     */
    toSignatureHelp(activeParameter=0){
        var signatureHelp = new vscode.SignatureHelp()
        var definition = this.getDifinition()
        var signature = new vscode.SignatureInformation(definition, new vscode.MarkdownString(this.documentation))
        signature.activeParameter = activeParameter

        var parametersSpans = this.getParametersSpans(definition.indexOf("(")+1)
        var params = parametersSpans.map(span=>{
            return new vscode.ParameterInformation([span[0], span[1]])
        })
        signature.parameters = params
        signatureHelp.signatures.push(signature)
        signatureHelp.activeParameter = activeParameter
        signatureHelp.activeSignature = 0
        return signatureHelp
    }
}

class ApiNamespace extends ApiElement{
    constructor(){
        super()
        this.children = []
        this.type = "namespace"
    }

    /**
     * 
     * @param {String} path 
     * @returns {ApiElement}
     */
    findElement(path){
        path = path.trimLeft()
        if(path=="") return null

        var parts = path.split(".")
        var element = this
        var prevElement = element
        parts.forEach((part, i)=>{
            if(prevElement){
                if(prevElement.type=="namespace"){
                    element = prevElement.children.find(x=>x.name==part)
                }
                prevElement = element
            }
        })
        if(!element) return null
        return element
    }
}

class ApiProvider{
    constructor(){
        
    }

    /**
     * 
     * @returns {Promise<Array<ApiNamespace>>}
     */
    async getNamespaces(){
        return []
    }
}


module.exports.ApiElement = ApiElement
module.exports.ApiProvider = ApiProvider
module.exports.ApiMethod = ApiMethod
module.exports.ApiNamespace = ApiNamespace
