window.trimJSON = function (input, control, scp, actionCtrl) {
    debugger;
    var keyList = ['name', 'niceName', 'id'];
    var result = input.data;
    var newResult = [];
    if(result && angular.isArray(result)) {
        for(var i=0; i<result.length; i++) {
                var arrayEle = {};
                for (var key in result[i])
                {
                    if(result[i].hasOwnProperty(key) && keyList.indexOf(key) >= 0)
                    {
                        arrayEle[key] = result[i][key];
                    }
                }
                newResult.push(arrayEle); 
        }
    }
    return newResult;
}
function checkObjectNumber(retArr, typeAheadKey) {
               if(retArr && retArr.length>0 && angular.isNumber(retArr[0][typeAheadKey])) {
                   for(var i=0;i <retArr.length; i++)
                       retArr[i][typeAheadKey] = String(retArr[i][typeAheadKey]);
               }
               return retArr;
           }
           
           function dataProcessorFunc(result, control, scp, actionCtrl){debugger
                var resp = angular.copy(result);
                var returnVal=[];
                if(angular.isArray(resp)) {
                    for(var i=0; i<resp.length; i++){
                       resp[i].ratedDriverName = resp[i].driverFullName;
                       resp[i].ratedDriverBIPD = resp[i].driverBIPD;
                       resp[i].ratedDriverMED = resp[i].driverMED;
                       resp[i].ratedDriverUM = resp[i].driverUM;
                       resp[i].ratedDriverCCD = resp[i].driverCCD;
                       resp[i].ratedDriverCOLL = resp[i].driverCOLL;
                    }
                return resp;
                } else {
                   resp.ratedDriverName = resp.driverFullName;
                   resp.ratedDriverBIPD = resp.driverBIPD;
                   resp.ratedDriverMED = resp.driverMED;
                   resp.ratedDriverUM = resp.driverUM;
                   resp.ratedDriverCCD = resp.driverCCD;
                   resp.ratedDriverCOLL = resp.driverCOLL;
                   returnVal[0] = resp;
                   return returnVal;
                }
           }

baseCtrl.prototype.setIPScope = function(scp)
{
    window.VlocOmniSI = scp;
    var afterSlash = '/' + window.location.href.split('.com/')[1].split('/')[0];
    if (afterSlash === 'apex') {
        afterSlash = '';
    }
    //scp.urlPrefix = window.location.origin + afterSlash;
   scp.applyCallResp({'urlPrefix':window.location.origin + afterSlash});
    //console.log('urlPrefix ', scp.urlPrefix);
}

    window.addEventListener('message', function(event){
         console.log('message received from iframe');
         //if (event.origin === '/apex/ObjectDocumentCreation2'){
//debugger;
              //document.getElementById('response').innerHTML = event.data;
             if(event.data && event.data.constructor===Object && event.data.hasOwnProperty("docGenAttachmentId") ){
              window.VlocOmniSI.applyCallResp(event.data);
             console.log(event.data+' Message');
        }
    }, false);