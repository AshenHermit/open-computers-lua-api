process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('request');
var fs = require('fs');
var agentOptions;
var agent;

var Xray = require('x-ray')
var xray = Xray()

request({
        url: "https://ocdoc.cil.li/api:component?do=edit", 
        method: 'GET', 
        agentOptions: {
            rejectUnauthorized: false
        }
    },
    function (err, resp, body) {    
        console.log(body)
        xray(body, "#wiki__text@html").then((text)=>{
            console.log(text)
            fs.writeFileSync("C:/Users/user/Downloads/doc.md", text)
        })
    }
);
