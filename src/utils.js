function mod(x, y){
    return x - y * Math.floor(x/y)
}

function getServerFromUrl(url){
    return url.split("/")[2]
}

/**
 * 
 * @param {RegExp} regex 
 * @param {String} text 
 */
function getLastMatchPosition(regex, text, rightSpan=false){
    regex.lastIndex = 0
    var lastMatchPosition = -1
    var match
    while ((match = regex.exec(text)) !== null) {
        if (match.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        var nextIndex = match.index
        if(rightSpan) nextIndex = match.index + match[0].length

        if(nextIndex == lastMatchPosition) break
        lastMatchPosition = nextIndex
    }
    return Math.max(0, lastMatchPosition)
}

function clamp(x, min, max){
    return Math.max(min, Math.min(x, max))
}

/**
 * @callback CharCallback
 * @param {String} char
 * @param {Number} index
 * @returns {boolean|void} should stop
 */

/** 
 * @param {String} text 
 * @param {Number} level - relative to current position
 * @param {CharCallback} callback 
 * @param {Number} [position] - default: 0
 * @param {Number} [direction] - 1 | -1, default: 1
 * @param {String} bracketOpen - default: "("
 * @param {String} bracketClose - default: ")"
 */
function scanBracketLevel(text, level, callback, position=0, direction=1, bracketOpen="(", bracketClose=")"){
    if(direction < 0) level = -level
    var balance = 0
    var i = clamp(position, 0, text.length-1)
    var iterations = 0
    var running = true
    while(i >= 0 && i < text.length && iterations < 9999 && running){
        var char = text[i];

        var checkBalanceSendCb = ()=>{
            if(balance == level){
                var shouldStop = callback(char, i)
                if(shouldStop) running = false
            }
        }
        var getBalanceEffectType = (char)=>{
            if(char != bracketOpen && char != bracketClose) return 0
            var isAdding = true
            if(char == bracketClose) isAdding = false
            if(direction<0) isAdding = !isAdding
            return isAdding?1:2
        }

        if(getBalanceEffectType(char)==1){
            balance += 1
            checkBalanceSendCb()
        }
        else if(getBalanceEffectType(char)==2){
            checkBalanceSendCb()
            balance -= 1
        }
        else{
            checkBalanceSendCb()
        }

        i += direction
        iterations += 1
    }
}
/**
 * @param {String} text 
 * @param {Number} currentPosition 
 * @param {String} bracketOpen - default: "("
 * @param {String} bracketClose - default: ")"
 */
function getCurrentBracketContentStart(text, currentPosition, bracketOpen="(", bracketClose=")"){
    var startIndex = -1
    scanBracketLevel(text, 0, (c,i)=>{
        if(startIndex==-1 && c==bracketOpen){
            startIndex = i+1
            return true
        }
    }, currentPosition, -1, bracketOpen, bracketClose)
    return startIndex
}

module.exports.mod = mod
module.exports.getLastMatchPosition = getLastMatchPosition
module.exports.getServerFromUrl = getServerFromUrl
module.exports.scanBracketLevel = scanBracketLevel
module.exports.getCurrentBracketContentStart = getCurrentBracketContentStart
module.exports.clamp = clamp