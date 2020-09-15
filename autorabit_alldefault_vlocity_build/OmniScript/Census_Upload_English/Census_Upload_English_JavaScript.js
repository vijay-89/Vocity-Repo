baseCtrl.prototype.$scope.censusLastActiveIndex = -1;

function fieldNameMatch(inputName, targetName) {
	inputName = inputName.toUpperCase();
	targetName = targetName.toUpperCase();
	
	let score = 0.0;
	for (let i=0;i<inputName.length;i++) {
		let inLetter = inputName.substr(i,1);
		let bestmatch = Math.max(inputName.length, targetName.length) + 1;
		for (let j=0;j<targetName.length;j++) {
			let targetLetter = targetName.substr(j,1);
			if (inLetter === targetLetter) {
				if (Math.abs(i-j) < bestmatch) {
					bestmatch = Math.abs(i-j);
				}
			}
		}
		score = score + bestmatch;
	}
	score = score / inputName.length;
	
	return score;
}

baseCtrl.prototype.$scope.censusUploadStepIsActive = function() {
    var scp = baseCtrl.prototype.$scope;
    if (scp.censusLastActiveIndex ==scp.activeIndex) {
        return;
    }
    scp.censusLastActiveIndex = scp.activeIndex;
    if (scp.children[scp.activeIndex].name == 'stepMappings') {
        // Do something here when the step is first visited or re-visited
        let data =  scp.bpTree.response;

        let fileHeaders = data.stepMappings.blkMappings.FileHeaders;
        let numFileHeaders = data.stepMappings.blkMappings.FileHeaders.length;

        let selHeaders = data.stepMappings.blkMappings.selTargetHeader;

        let mappings = scp.children[scp.activeIndex].children[1].eleArray[0].children[3].eleArray["0"].propSetMap.options;
        let numMappings = scp.children[scp.activeIndex].children[1].eleArray[0].children[3].eleArray["0"].propSetMap.options.length;
        let results = {};
        results['stepMappings']={};
        results.stepMappings['blkMappings'] = {}
        results.stepMappings.blkMappings['selTargetHeader'] = [];
        let output = results.stepMappings.blkMappings.selTargetHeader;
        
        for (let i=0;i<numFileHeaders;i++) {
        	let bestScore = 999999;
        	let bestIndex = 0;
        	
        	for (let j=0;j<numMappings;j++) {
        		let score = fieldNameMatch(fileHeaders[i], mappings[j].value);
        		if (score < bestScore) {
        			bestScore = score;
        			bestIndex = j;
        		}
        	}
        	
        	if (bestScore <= fileHeaders[i].length / 1.5 ) {
	        	output[i] = mappings[bestIndex].name;
	        } else {
	        	output[i] = null;
	        }
        }
       	baseCtrl.prototype.$scope.applyCallResp(results);
    }
};