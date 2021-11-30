const vscode = require('vscode');
const { ApiProvider, ApiNamespace } = require('./apiProvider');
const { getLastMatchPosition, getCurrentBracketContentStart, scanBracketLevel } = require('./utils');

class CodeCompleter{
    /**
     * @param {ApiProvider} apiProvider 
     */
    constructor(apiProvider){
        this.apiProvider = apiProvider
        this.language = "lua"
        /**@type {ApiNamespace} */
        this.globalNamespace = new ApiNamespace()
        this.setup()
    }
    async setup(){
        this.globalNamespace.children = await this.apiProvider.getNamespaces()
    }
    getDocumentSelector(){
        return this.language
    }
    /**
     * 
     * @param {String} path 
     * @returns {ApiNamespace}
     */
     findApiElementByPath(path){
        path = path.trimLeft()
        var namespace = this.globalNamespace
        if(path=="") return namespace

        var parts = path.split(".")
        parts.forEach((part, i)=>{
            if(namespace){
                namespace = namespace.children.find(x=>x.name==part)
            }
        })
        return namespace
    }

    

    /**
     * @param {String} line 
     * @param {vscode.Position} position 
     */
    getActiveParameterIndex(line, position){
        line = line.substring(0, position.character)
        var leftParameters = line.substring(getCurrentBracketContentStart(line, position.character))
        var activeParameter = 0
        scanBracketLevel(leftParameters, 0, (c,i)=>{
            if(c==",") activeParameter+=1
        })
        return activeParameter
    }

    getCurrentElementPath(document, position, levelFromRight=0){
        var line = document.lineAt(position).text
        var pathEnd = getLastMatchPosition(/\(/g, line, false)
        var pathStart = getLastMatchPosition(/[\s]|[^\._\w]/g, line.substring(0, pathEnd), true)
    }

    /**
     * @param {vscode.TextDocument} document 
     * @param {vscode.Position} position 
     */
    provideCompletionItems(document, position, token, context) {
        var insertPos = position
        var line = document.lineAt(position).text
        var pathStart = getLastMatchPosition(/[\s]|[^\._\w]/g, line.substring(0, position.character), true)
        line = line.substring(pathStart)

        var linePrefix = line.substring(0, position.character)
        var dotPosition = linePrefix.lastIndexOf(".")
        var rightText = line.substring(dotPosition)
        var exceptRegex = /[\s\(\)]/gi
        var path = ""

        if(dotPosition!=-1){
            insertPos = new vscode.Position(position.line, dotPosition+1)
            path = line.substring(0, dotPosition)
        }
        console.log(line)
        
        var namespace = !path ? this.globalNamespace : this.globalNamespace.findElement(path)
        console.log(namespace)
        console.log(this.globalNamespace)
        if(namespace){
            if(namespace.type == "namespace"){
                return namespace.children.map(x=>x.toCompletionItem())
            }
        }else{
            return []
        }

    }

    /**
     * @param {vscode.TextDocument} document 
     * @param {vscode.Position} position 
     */
    provideSignatureHelp(document, position, token, context) {
        var line = document.lineAt(position).text
        var activeParameter = this.getActiveParameterIndex(line, position)

        line = line.substring(0, position.character)
        var pathEnd = getCurrentBracketContentStart(line, position.character) - 1
        var pathStart = getLastMatchPosition(/[\s]|[^\._\w]/g, line.substring(0, pathEnd), true)
        var path = line.substring(pathStart, pathEnd)
        
        var element = this.globalNamespace.findElement(path)
        if(element){
            if(element.type=="method"){
                return element.toSignatureHelp(activeParameter)
            }
        }
        return null
    }

    setupSubscriptions(contextSubscriptions){
        contextSubscriptions.push(vscode.languages.registerCompletionItemProvider(
            this.getDocumentSelector(), 
            {provideCompletionItems: this.provideCompletionItems.bind(this)},
            '.'
        ))
        contextSubscriptions.push(vscode.languages.registerSignatureHelpProvider(
            this.getDocumentSelector(), 
            {provideSignatureHelp: this.provideSignatureHelp.bind(this)},
            '.'
        ))
    }
    configureLanguage(){
        
    }
}

module.exports.CodeCompleter = CodeCompleter