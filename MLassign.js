// Part of Learningautomation.io's Cange Classification Demo
/***************************************************************************
Puppeteer Script to Automate Change Requests Assignments using Headless Chrome
before first time use install Puppeteer using npm via the following command:
> npm install puppeteer

 Then run the puppeteer script by issuing via Nodejs:
> node MLassign.js
******************************************************************************/

const puppeteer = require('puppeteer');
const fs = require("fs");
const http = require('http');

const team_map = require('./team_map.json');
const classification_map = require('./classification_map.json');
const requestor_map = require('./requestor_map.json');
const location_map = require('./location_map.json');
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


   /* #######################################################################
      ## Scrap Change Requests page for all the CR data to put in an array ##
      ####################################################################### 
      
      Variables:

      crTitle = Title of Change Request
      serviceName = Service name of CR or WO
      crNumber = Change Request number or ID
      environment = Production, Staging, etc.
        
      */


    await page.goto('http://35.208.193.46:8080/index.html', {waitUntil: 'networkidle2'});
    
    
    //Scrap page for all tablerows and put into an array called data
    const data = await page.evaluate(() => {
       const tds = Array.from(document.querySelectorAll('table tr'))
       //const tds = Array.from( document.querySelectorAll( 'table tr' )).filter( tr => td.textContent === 'Initiated - waiting for assignment' )
        return tds.map(td => td.innerHTML)
      });

    //Filter the data array based on CRs that are waiting for initial assignment
    var crStatus = 'Initiated - waiting for assignment';
    initialAssignmentArray = data.filter(function (str) { return str.includes(crStatus); });
    
    //Display this array in console
    //console.log(initialAssignmentArray[0].slice(29,34));
    //console.log(initialAssignmentArray[1].slice(29,34));
    
    //Loop over each Change Requests and go to each Change page
    for (CR in initialAssignmentArray) {
        await page.goto('http://35.208.193.46:8080/change.html?id=' + initialAssignmentArray[CR].slice(29,34), {waitUntil: 'networkidle2'});
        
        // await page.waitFor(2000); //waiting for Vue to populate fields

        //Use a jsHandle to pull CR Title from page
        const titleHandle = await page.evaluateHandle(() => {
        var crTitle = document.getElementById('Description');
        return crTitle;
        });
        
        //Use a jsHandle to pull Service Name from page
        const serviceNameHandle = await page.evaluateHandle(() => {
            var serviceName = document.getElementById('Service');
            return serviceName;
         });

        //Use a jsHandle to pull Environment from page
        const environmentHandle = await page.evaluateHandle(() => {
            var environment = document.getElementById('Environment');
            return environment;
         });

        //Use a jsHandle to pull Classification from page
        const classificationHandle = await page.evaluateHandle(() => {
          var classificationAnchor = document.getElementById('Classification');
          return classificationAnchor;
        });

        //Use a jsHandle to pull Requestor Name from page
        const requestorHandle = await page.evaluateHandle(() => {
           var requestorAnchor = document.getElementById('Requestor');
           return requestorAnchor;
        });

        //Use a jsHandle to pull Client Name from page
        const clientHandle = await page.evaluateHandle(() => {
            var clientAnchor = document.getElementById('Client');
            return clientAnchor;
         });        

        //Use a jsHandle to pull location Name from page
        const locationHandle = await page.evaluateHandle(() => {
            var locationAnchor = document.getElementById('Location');
            return locationAnchor;
         });     
         
        const crTitle = await page.evaluate(e => e.innerHTML, titleHandle);
        const serviceName = await page.evaluate(e => e.innerHTML, serviceNameHandle);
        const classification = await page.evaluate(e => e.innerHTML, classificationHandle);
        const requestorName = await page.evaluate(e => e.innerHTML, requestorHandle);       
        const locationName = await page.evaluate(e => e.innerHTML, locationHandle);
        const crNumber = initialAssignmentArray[CR].slice(29,34);
        const environment = await page.evaluate(e => e.innerHTML, environmentHandle);
        const clientName = await page.evaluate(e => e.innerHTML, clientHandle);

        console.log("CR", crNumber, "-", environment, "-", serviceName, "-",  crTitle, "-", requestorName); // Display CR Number and CR Title
       

        /* ###################################################################################
           ## Below is where all the logic and magic happens for auto assigning CRs and WOs ##
           ################################################################################### */
          
          // 1) Using Prediction API to assign changes

           var requestor_num = requestor_map[requestorName];
           var classification_num = classification_map[classification];
          //  var service_num = service_map[serviceName];
           var client_num = client_map[clientName];
           var location_num = location_map[locationName];

           var predictURL = 'http://35.208.193.46:5000/predict/' + requestor_num + '/' + classification_num + '/' + client_num + '/' + location_num
           console.log(predictURL);

           await page.goto(predictURL);

           var content = await page.content(); 
       
           predictResp = await page.evaluate(() =>  {
               return JSON.parse(document.querySelector("body").innerText); 
           }); 
       
           await page.goto('http://35.208.193.46:8080/change.html?id=' + initialAssignmentArray[CR].slice(29,34), {waitUntil: 'networkidle2'});
 
           //Set Team dropdown to correct team from Prediction API
           await page.select('[name=assignedTeam]', predictResp.team.toString());
          
          //Click Submit to Save
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'load' }),
            page.click('[type=submit]'),
          ]);
          console.log (crNumber, " has been Assigned to " + predictResp.team);
          }
        

   await browser.close();
} catch (e) {
    console.log('puppeteer error: ', e)
}

})();