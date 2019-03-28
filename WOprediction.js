/***************************************************************************
Puppeteer Script to Automate eCMS Assignments using Headless Chrome
before first time use install Puppeteer using npm via the following command:
> npm install puppeteer

 Then run the puppeteer script by issuing via Nodejs:
> node assign.js
******************************************************************************/

const puppeteer = require('puppeteer');
const fs = require("fs");
const http = require('http');

const technical_team_map = require('./technical_team_map.json');
const classification_map = require('./classification_map.json');
const requestor_map = require('./requestor_map.json');
const location_map = require('./location_map.json');
const service_map = require('./service_map.json');
const client_map = require('./client_map.json');

(async function main() {
try {

    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true, 
        headless: false,
        args: ['--start-maximized', '--window-size=1920,1000']
    });
    const page = await browser.newPage();
    page.setUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36');
    page.setViewport({ width: 1920, height: 1000 })

    //const username = 'username';
    //const password = 'password';
    //await page.authenticate({ username, password });

   /* ###################################################################
      ## Scrap eCMS page for all the CR and WO data to put in an array ##
      ################################################################### 
      
      Variables:

      ecmsType = CR or WO (to determine if its a Change request or Work Order)
      crTitle = Title of CR or WO
      serviceName = Service name of CR or WO
      crNumber = number or CR or WO
      environment = Production, Staging, etc. (only available for CRs and not WOs)
        
      */
       var myArgs = process.argv.slice(2);

        await page.goto('https://ecms/RequestEdit.phtml?Request=' + myArgs[0], {waitUntil: 'networkidle2'});
        
         //Use a jsHandle to check whether it is a WO or CR
         const ecmsTypeHandle = await page.evaluateHandle(() => {
            var ecmsType = document.getElementsByClassName('FormHeaderNumber');
            return ecmsType;
            });

        //Use a jsHandle to pull CR Title from page
        const titleHandle = await page.evaluateHandle(() => {
        var crTitle = document.getElementsByName('ObjectiveAnchor');
        return crTitle;
        });
        
        //Use a jsHandle to pull Service Name from page
        const serviceNameHandle = await page.evaluateHandle(() => {
            var serviceName = document.getElementsByName('ServiceAnchor');
            return serviceName;
         });

        //Use a jsHandle to pull Environment from page
        const environmentHandle = await page.evaluateHandle(() => {
            var environment = document.getElementsByName('EnvironmentAnchor');
            return environment;
         });

                //Use a jsHandle to pull Type from page
        const typeAnchorHandle = await page.evaluateHandle(() => {
          var typeAnchor = document.getElementsByName('TypeAnchor');
          return typeAnchor;
        });

        //Use a jsHandle to pull Classification from page
        const classificationAnchorHandle = await page.evaluateHandle(() => {
          var classificationAnchor = document.getElementsByName('ClassificationAnchor');
          return classificationAnchor;
        });

        //Use a jsHandle to pull Requestor Name from page
        const requestorHandle = await page.evaluateHandle(() => {
           var requestorAnchor = document.getElementsByClassName('TableDescriptionTDLeft');
           //var name = requestorAnchor[0].innerHTML.split("<br>",1).toString().slice(9);  //removes the spaces at the beginning
           return requestorAnchor;
        });

        //Use a jsHandle to pull Client Name from page
        const clientHandle = await page.evaluateHandle(() => {
            var clientAnchor = document.getElementsByName('ClientAnchor');
            return clientAnchor;
         });        

        //Use a jsHandle to pull location Name from page
        const locationHandle = await page.evaluateHandle(() => {
            var locationAnchor = document.getElementsByName('LocationAnchor');
            return locationAnchor;
         });        

        const ecmsType = await page.evaluate(e => e[0].innerHTML, ecmsTypeHandle);
        const crTitle = await page.evaluate(e => e[0].innerHTML, titleHandle);
        const serviceName = await page.evaluate(e => e[0].innerHTML, serviceNameHandle);
        const requestorName = await page.evaluate(e => e[0].innerHTML.split("<br>",1).toString().slice(9), requestorHandle);
        const clientName = await page.evaluate(e => e[0].innerHTML, clientHandle);
        const locationName = await page.evaluate(e => e[0].innerHTML, locationHandle);
        
      
        //Only pull environment variable if eCMS Type is a Change Request as WOs dont have this field
        if(ecmsType.slice(0,1) == 'C') { 
          environment = await page.evaluate(e => e[0].innerHTML, environmentHandle);
          typeAnchor = await page.evaluate(e => e[0].innerHTML, typeAnchorHandle);
          console.log("CR", " - ", " - ", serviceName, " - Type: ", typeAnchor, " - ",  crTitle);
          console.log("This is not a Work Order") // Display CR Number and CR Title
        }else {
          environment = "N/A";
          typeAnchor = await page.evaluate(e => e[0].innerHTML, classificationAnchorHandle);
          console.log("WO",myArgs[0], " - ", serviceName, " - ", clientName, " - Type: ", typeAnchor, " - ", locationName, " - Requestor: ", requestorName); // Display CR Number and CR Title
          console.log(crTitle);
          console.log("");
        }
    

        /* ###################################################################################
           ## Below is where all the logic and magic happens for auto assigning CRs and WOs ##
           ################################################################################### */
          
          // 1) Using Prediction API to assign WOs
                    
           var requestor_num = requestor_map[requestorName];
           var classification_num = classification_map[typeAnchor];
           var service_num = service_map[serviceName];
           var client_num = client_map[clientName];
           var location_num = location_map[locationName];

           predictURL = 'http://127.0.0.1:5000/predict/' + requestor_num + '/' + classification_num + '/' + service_num +'/' + client_num + '/' + location_num
           console.log(predictURL);

           await page.goto('http://127.0.0.1:5000/predict/' + requestor_num + '/' + classification_num + '/' + service_num +'/' + client_num + '/' + location_num);

           var content = await page.content(); 
       
           predictResp = await page.evaluate(() =>  {
               return JSON.parse(document.querySelector("body").innerText); 
           }); 

           await console.log("Please Assign To " + predictResp.team)
       
          
    
    //await page.goto('https://ecms/checklistassignment.phtml?Request=260381');

  await browser.close();
} catch (e) {
    console.log('puppeteer error: ', e)
}

})();