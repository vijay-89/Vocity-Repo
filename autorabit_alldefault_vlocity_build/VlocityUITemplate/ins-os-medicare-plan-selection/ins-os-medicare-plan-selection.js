vlocity.cardframework.registerModule.controller('insOsSmallGroupPlanSelectionCtrl', ['$scope', '$rootScope', '$timeout', '$q', '$document', '$sldsModal', function($scope, $rootScope, $timeout, $q, $document, $sldsModal) {
    'use strict';
    console.log("every time");
    const cartPageSize = 3;
    let bpTreeResponse;
    let scp;
    let remotePageSize;
    let remoteRespCount = 0;
    $scope.currencyCode = '$';
    if (baseCtrl.prototype.$scope.bpTree.propSetMap.currencyCode) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.propSetMap.currencyCode;
    } else if (baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol) {
        $scope.currencyCode = baseCtrl.prototype.$scope.bpTree.oSCurrencySymbol;
    }

    $scope.getNumberUnselected = function(numunsel){
        return _.range(numunsel);
    }

    $scope.getNumberSelected = function(numsel){
        return _.range(numsel);
    }

    //  $scope.$watch('baseCtrl.$scope.bpTree.response.random',function(){
    //      console.log("HERE");
    //      $scope.insSelectionInit(baseCtrl, $scope.control);
    //  });
    let random=0;
    $scope.initOnDemand=function(baseCtrl,control){ 
         if(random && random!==0 && baseCtrl.$scope.bpTree.response.random!==random){
            console.log("HERE");
            $scope.insSelectionInit(baseCtrl, $scope.control, true);
         }
         random=baseCtrl.$scope.bpTree.response.random;

         
    }

    // Template initialization
    /**
     * @param {Object} baseCtrl OS baseCtrl
     * @param {Object} control Element control
     */
    $scope.insSelectionInit = function(baseCtrl, control, clearCart) {
        console.log("INIT is getting called",control);
        // OS dataJSON object
        bpTreeResponse = baseCtrl.$scope.bpTree.response;
        // OS scope
        scp = baseCtrl.$scope;
        
        setTimeout(() => {
            console.info(control);
        }, 5000);
        
        // Determines minimum number of plans that should be added to the page each time you request more
        remotePageSize = control.propSetMap.remoteOptions.pageSize;
        // This key is defined in the OS Script Configuration JSON
        //const insSgpsKey = baseCtrl.$scope.bpTree.propSetMap.itemsKey;
        const insSgpsKey = 'planSelection';
        // This creates a custom node in the dataJSON to track plan selections across multiple OS steps
         bpTreeResponse[insSgpsKey] = bpTreeResponse[insSgpsKey] || {};
         $scope.insSgpsNode = bpTreeResponse[insSgpsKey];
        // $scope.insSgpsNode = {};
        
        $scope.insSgpsNode.selectedPlansMap = $scope.insSgpsNode.selectedPlansMap || {};
        $scope.insSgpsNode.compareSelectMap = {};

        
        // Initialize data on the first OS step this template is used
        if (!$scope.insSgpsNode.cartPlans || clearCart) {
            $scope.insSgpsNode.cartPlans = [];
            const selectableItems = control.vlcSI[control.itemsKey];
            if (selectableItems.length) {
                // Initialization if renewal OS
                renewalInit(selectableItems);
            }
        }
        // Remove any compare flags from previous step
        angular.forEach($scope.insSgpsNode.cartPlans, function(plan) {
            delete plan.vlcCompSelected;
        });
        control[control.name] = {};
        formatCart(0, true);
        // Initial call to get available plans, wrapped in timeout so $rootScope.loading gets set after page is ready
        $timeout(function() {
            remoteInvoke(control)
            .then(function(remoteResp) {
                
                control[control.name].unselectedNewPlans = [];
                control[control.name].selectedFilters = {};
                control[control.name].filterAttrValues = remoteResp[control.name].filterAttrValues || {};
                control[control.name].filtersAvailable = _.isEmpty(control[control.name].filterAttrValues) ? false : true;
                angular.forEach(control[control.name].filterAttrValues, function(filter) {
                    filter.listOfValues = _.uniq(filter.listOfValues).sort();
                });
                const newPlans = remoteResp[control.name].ratedProducts.records;
                formatNewPlans(newPlans, control, true);
                dataJsonSync();
            })
            .catch(angular.noop);
        }, 0);
    };
    // Toggles whether filters dropdown is open
    $scope.toggleFiltersDropdown = function() {
        $scope.openFilterDropdown = !$scope.openFilterDropdown;
    };

    // Toggles selected filter and makes remote call to refresh list of available products
    /**
     * @param {String} filterKey Name of filter type
     * @param {String} value User selected filter value
     * @param {Object} control Element control
     */
    $scope.toggleFilter = function(filterKey, value, control) {
        control[control.name].lastResultReached = false;
        control[control.name].selectedFilters[filterKey] = control[control.name].selectedFilters[filterKey] || [];
        const valueIndex = control[control.name].selectedFilters[filterKey].indexOf(value);
        if (valueIndex > -1) {
            control[control.name].selectedFilters[filterKey].splice(valueIndex, 1);
            if (!control[control.name].selectedFilters[filterKey].length) {
                delete control[control.name].selectedFilters[filterKey];
            }
        } else {
            control[control.name].selectedFilters[filterKey].push(value);
        }
        delete bpTreeResponse.lastRecordId;
        delete control[control.name].lastRecordId;
        remoteInvoke(control)
        .then(function(remoteResp) {
            
            control[control.name].unselectedNewPlans = [];
            const newPlans = remoteResp[control.name].ratedProducts.records;
            formatNewPlans(newPlans, control, false, true);
        })
        .catch(angular.noop);
    };

    // Requests additional plans based on lastRecordId
    /**
     * @param {Object} control Element control
     */
    $scope.getMorePlans = function(control) {
        bpTreeResponse.lastRecordId = control[control.name].lastRecordId;
        remoteInvoke(control)
        .then(function(remoteResp) {
            
            const newPlans = remoteResp[control.name].ratedProducts.records;
            formatNewPlans(newPlans, control, false);
        })
        .catch(angular.noop);
    };

    // Handle renewal plans and new plans in cart
    /**
     * @param {Object} plan Cart plan
     * @param {Object} control Element control
     */
    $scope.toggleCartPlan = function(plan, control) {
        // Flag to determine whether to select or deselect
        const deselecting = plan.selected;
        if (deselecting) {
            if (plan.renewal) {
                // Renewal plans get tracked if they are being deleted
                $scope.insSgpsNode.renewalPlansToDelete[plan.Id] = true;
                
            } else {
                // Add non-renewal plan back to bottom list
                delete $scope.insSgpsNode.selectedPlansMap[plan.Id];
                $scope.insSgpsNode.cartPlans.splice(plan.originalIndex, 1);
                formatCart($scope.insSgpsNode.displayedCartPlans[0].originalIndex, true);
                control[control.name].unselectedNewPlans.unshift(plan);
            }
        } else {
            // If plan is being renewed nothing needs to be tracked
            delete $scope.insSgpsNode.renewalPlansToDelete[plan.Id];
        }
        plan.selected = !plan.selected;
        $scope.bpTree.response.NoMedicalSelected = 0;
        angular.forEach($scope.insSgpsNode.selectedPlansMap, function(selectedPlan){
            if(selectedPlan.Type__c == 'Medical') $scope.bpTree.response.NoMedicalSelected += 1;
        });
        dataJsonSync();
    };

    // Add new plan to cart
    /**
     * @param {Object} plan Selected plan
     * @param {Number} planIndex Index in displayedPlans
     * @param {Object} control Element control
     */
    $scope.addNewPlan = function(plan, planIndex, control) {
        plan.selected = true;
        $scope.insSgpsNode.selectedPlansMap[plan.Id] = plan;
        control[control.name].unselectedNewPlans.splice(planIndex, 1);
        $scope.insSgpsNode.cartPlans.unshift(plan);
        formatCart(0, true);
        $scope.bpTree.response.NoMedicalSelected = 0;
        angular.forEach($scope.insSgpsNode.selectedPlansMap, function(selectedPlan){
            if(selectedPlan.Type__c == 'Medical') $scope.bpTree.response.NoMedicalSelected += 1;
        });
        dataJsonSync();
    };

    // Helper method to display number of selected filters
    $scope.selectedFiltersCount = function(control) {
        let count = 0;
        angular.forEach(control[control.name].selectedFilters, function(array) {
            count += array.length;
        });
        return count;
    };

    // Helper method to display filter checkbox
    /**
     * @param {String} filterKey Filter type
     * @param {String} value Filter value
     */
    $scope.isFilterSelected = function(filterKey, value, control) {
        if (control[control.name].selectedFilters[filterKey] && control[control.name].selectedFilters[filterKey].indexOf(value) > -1) {
            return true;
        }
    };

    // Adds plan to list for compare modal
    /**
     * @param {Object} plan Can be either a renewal or new plan
     */
    $scope.toggleCompareSelect = function(plan) {
       
            if ( !$scope.insSgpsNode.compareSelectMap[plan.Id] ) {
                $scope.insSgpsNode.compareSelectMap[plan.Id] = plan;
                if(Object.keys($scope.insSgpsNode.compareSelectMap).length <= 3){
                    
                    plan.vlcCompSelected = true;
                }else{
                    delete $scope.insSgpsNode.compareSelectMap[plan.Id];
                    plan.vlcCompSelected = false;    
                }
            } else {
                delete $scope.insSgpsNode.compareSelectMap[plan.Id];
                plan.vlcCompSelected = false;
            }
    };

    // Gets called when clicking next/previous directional buttons at top
    /**
     * @param {String} direction Prev or Next
     */
    $scope.paginateItems = function(direction) {
        const currentIndex = $scope.insSgpsNode.displayedCartPlans[0].originalIndex;
        let newIndex = 0;
        if (direction === 'prev') {
            newIndex = currentIndex - cartPageSize;
        } else if (direction === 'next') {
            newIndex = currentIndex + cartPageSize;
        }
        formatCart(newIndex);
    };

    // Count how many cart plans are selected
    $scope.selectedPlansCount = function() {
        let count = 0;
        angular.forEach($scope.insSgpsNode.cartPlans, function(plan) {
            if (plan.selected) {
                count += 1;
            }
        });
        return count;
    };

    //Launch compare modal - right now it is a fixed template but this is exposed js, to-do: use OS modal template
    $scope.openCompareModal = function(plan, control) {
        if (plan) {
            $scope.modalRecords = [plan, plan.originalPlan.records[0]];
            $scope.isSelectable = false;
        } else {
            $scope.modalRecords = _.values($scope.insSgpsNode.compareSelectMap);
            $scope.isSelectable = true;
        }
        $sldsModal({
            backdrop: 'static',
            title: 'Compare Plans',
            scope: $scope,
            showLastYear: true,
            animation: true,
            templateUrl: control.propSetMap.modalHTMLTemplateId,
            show: true
        });
    };

    //Launch compare modal - right now it is a fixed template but this is exposed js, to-do: use OS modal template
    $scope.openDetailModal = function(plan, control) {
        console.log("template - modal: ", control)
        $scope.modalRecords = [plan];//modalProducts = list of product and last years
        $scope.isSelectable = false;
        $sldsModal({
            backdrop: 'static',
            title: 'View Details',
            scope: $scope,
            showLastYear: true,
            animation: true,
            templateUrl: control.propSetMap.modalHTMLTemplateId,
            show: true
        });
    };

    // Toggles plan selection from within compare modal
    /**
     * @param {Object} plan Can be either a renewal or new plan
     * @param {Object} control Element control
     */
    $scope.toggleModalPlan = function(plan, control) {
        if (plan.selected || plan.renewal) {
            $scope.toggleCartPlan(plan, control);
        } else {
            plan.selected = true;
            const unselectedNewPlans = control[control.name].unselectedNewPlans;
            // Find index in new plans to splice and move into cart
            for (let i = 0; i < unselectedNewPlans.length; i++) {
                const newPlan = unselectedNewPlans[i];
                if (plan.Id === newPlan.Id) {
                    $scope.addNewPlan(plan, i, control);
                    break;
                }
            }
        }
    };

    // Initialize data for renewal OS
    /**
    * @param {Object} selectableItems control.vlcSI[control.itemsKey]
    */
    function renewalInit(selectableItems) {
        $scope.insSgpsNode.renewalPlansToDelete = {};
        angular.forEach(selectableItems, function(plan) {
            plan.selected = true;
            plan.renewal = true;
            setTierClass(plan);
            if ($scope.insSgpsNode.renewalPlansToDelete[plan.Id]) {
                plan.selected = false;
            }
        });
        Array.prototype.push.apply($scope.insSgpsNode.cartPlans, selectableItems);
    }

    // Set tier for default icon color
    /**
    * @param {Object} plan
    */
    function setTierClass(plan) {
     try{
            const name = plan.Name || plan.productName;
        if (plan[baseCtrl.prototype.$scope.nsPrefix + 'Tier__c']) {
            plan.tierClass = plan[baseCtrl.prototype.$scope.nsPrefix + 'plan.TierClass__c'].toLowerCase();
        } else if (name.toLowerCase().indexOf('gold') > -1) {
            plan.tierClass = 'gold';
        } else if (name.toLowerCase().indexOf('silver') > -1) {
            plan.tierClass = 'silver';
        } else if (name.toLowerCase().indexOf('bronze') > -1) {
            plan.tierClass = 'bronze';
        }
     }catch(e){}
    };

    // Index cart items
    /**
    * @param {Number} newIndex Starting index of cart plans subset
    * @param {Boolean} [reindex] Flag to refresh original indexes
    */
    function formatCart(newIndex, reindex) {
        if (reindex) {
            angular.forEach($scope.insSgpsNode.cartPlans, function(plan, i) {
                plan.originalIndex = i;
            });
        }
        $scope.insSgpsNode.displayedCartPlans = $scope.insSgpsNode.cartPlans.slice(newIndex, newIndex + cartPageSize);
        $scope.insSgpsNode.prevDisabled = newIndex === 0 ? true : false;
        $scope.insSgpsNode.nextDisabled = newIndex + cartPageSize >= $scope.insSgpsNode.cartPlans.length ? true : false;
    }

    // Dedupes and sets tiers for new plans
    /**
     * @param {Array} newPlans Plans returned from remote method
     * @param {Object} control Element control
     */
    function formatNewPlans(newPlans, control,isFirstCall, filtersUpdated) {
        console.log('newPlans: ' , newPlans);
        const newLastRecordId = newPlans ? newPlans[newPlans.length - 1].Id : null;
        if (!newPlans || control[control.name].lastRecordId === newLastRecordId) {
            
            control[control.name].lastResultReached = true;
            remoteRespCount = 0;
            return;
        }
        try{
            sortOnProductOrderRating(newPlans);
            if(ifReverse()){
            newPlans.reverse(); 
            }
            if(isFirstCall){
                bpTreeResponse.bestPlans = [];
                for(let i=0;i<newPlans.length ;i++){
                    if(i>1) break;
                    newPlans[i]["bestMatch"]=true;
                    bpTreeResponse.bestPlans[i] = newPlans[i].ProductCode;
                }
            }
            if (filtersUpdated) {
                for(let i=0;i<newPlans.length ;i++){
                    if (bpTreeResponse.bestPlans.includes(newPlans[i].ProductCode))
                    newPlans[i]["bestMatch"]=true;
                }
            }
        }catch(e){}
        control[control.name].lastRecordId = newLastRecordId;
        for (let i = 0; i < newPlans.length; i++) {
	    try {
            $scope.createProductsList(newPlans[i]);
		    if (isNewPlan(newPlans[i])) {
                setTierClass(newPlans[i]);
                control[control.name].unselectedNewPlans.push(newPlans[i]);
                $scope.getRateMedicare(plan, bpTreeResponse, control[control.name].unselectedNewPlans);
                remoteRespCount += 1;
		    }
	        } catch (err) {
		        console.log("error", err.message);
            }
        }
        // angular.forEach(JSON.parse(newPlan), function(plan) {
        //     if (isNewPlan(plan)) {
        //         setTierClass(plan);
        //         control[control.name].unselectedNewPlans.push(plan);
        //         $scope.getRateMedicare(plan,bpTreeResponse,control[control.name].unselectedNewPlans);
        //         remoteRespCount += 1;
        //     }
        // });

        if (remoteRespCount < remotePageSize) {
            $scope.getMorePlans(control);
        } else {
            remoteRespCount = 0;
        }
       // control[control.name].unselectedNewPlans =  _.sortBy(control[control.name].unselectedNewPlans, 'Price' ); 
    }

    // Check if new plan is already being tracked
    /**
     * @param {Object} plan
     */
    function isNewPlan(plan) {
        for (let i = 0; i < $scope.insSgpsNode.cartPlans.length; i++) {
            const cartPlan = $scope.insSgpsNode.cartPlans[i];
            if (plan.Id === cartPlan.Id || plan.Id === cartPlan.productId) {
                return false;
            }
        }
        return true;
    }

    // Calls OmniScript buttonClick method, which invokes remote method defined on the Selectable Items action
    /**
     * @param {Object} control Element control} control
     */
    function remoteInvoke(control) {
        const deferred = $q.defer();
        $rootScope.loading = true;
        bpTreeResponse.attributeFilters = control[control.name].selectedFilters;
        scp.buttonClick(bpTreeResponse, control, scp, undefined, 'typeAheadSearch', undefined, function(remoteResp) {
            deferred.resolve(remoteResp);
        });
        return deferred.promise;
    }

    // Keep plan selections in sync across OS steps
    function dataJsonSync() {
        $scope.insSgpsNode.selectedPlans = [];
        angular.forEach($scope.insSgpsNode.selectedPlansMap, function(selectedPlan) {
            $scope.insSgpsNode.selectedPlans.push(selectedPlan);
        });
        // For renewal OS - need to track quote line item ids for deletion from quote
        if (!_.isEmpty($scope.insSgpsNode.renewalPlansToDelete)) {
            $scope.insSgpsNode.unselectedIds = Object.keys($scope.insSgpsNode.renewalPlansToDelete);
        }
    }

    $scope.getRateMedicare = function (plan,bpResponse,unselectedNewPlans){
        var className = '%vlocity_namespace%.IntegrationProcedureService';
        var classMethod = 'Rating_GetMedicalMedicareRate';  
        if(className && classMethod) {            
            var tin = 0;
            if(bpResponse.lowIncomeSubsidy.getHelpOptions == 'ReceivePartialHelp'){
                tin = bpResponse.lowIncomeSubsidy.partialExtraHelp.extraHelp ;
            }       
            var input = {
                    ProductCode : plan.ProductCode,
                    LISSubsidy: tin
            };
            console.log('angular.toJson(input)' ,angular.toJson(input) );
            $scope.medicalData = $scope.bpService.GenericInvoke(className, classMethod, angular.toJson(input), '{}').then(function(result){
                    $scope.medicalData = JSON.parse(result);            
                    //Check existance of Tobbaco members
                        plan.Price = $scope.medicalData.IPResult.output;

                        //Sort the Medical Plans by Price 
                        //Future: Use Filters to sort (Attributes, categories?)
                        unselectedNewPlans.sort(function(a,b){return a.Price - b.Price});
                }).catch(function(err){
                    console.info("The Error Was...", err)
                });   
        }            
    }

    //Push the elements to the new empty array
    $scope.createProductsList = function(plan) {
        var productData = [];
        plan.prodList = [];

        angular.forEach(plan.attributeCategories.records[0],function(element) {
            angular.forEach(element.records,function(obj) {
                if (obj.label === 'Annual Deductible') {
                    obj.newPosition = 3;
                }
                if (obj.label === 'Premium Amount (Monthly)') {
                    obj.newPosition = 1;
                }
                if (obj.label === 'Emergency Care') {
                    obj.newPosition = 6;
                }
                if (obj.label === 'Primary Care Provider Office Visits') {
                    obj.newPosition = 4;
                }
                if (obj.label === 'Specialty Care Provider Office Visit - In Network') {
                    obj.newPosition = 5;
                }
                if (obj.label === 'Out of Pocket Maximum - In Network') {
                    obj.newPosition = 2;
                }
                if (obj.label === 'Summary of Benefit & Coverage') {
                    obj.newPosition = 8;
                }
                if (obj.label === 'Evidence of Coverage') {
                    obj.newPosition = 9;
                }
                if (obj.label === 'Provider Directory') {
                    obj.newPosition = 10;
                }
                if (obj.label === 'Pharmacy Directory') {
                    obj.newPosition = 11;
                }
                if (obj.label === 'Prescription Drug List') {
                    obj.newPosition = 12;
                }
                productData = {"name": obj.label, "sortedList": obj.newPosition, "value": obj.userValues};
                plan.prodList.push(productData);
            });
        });
        productData = {"name": "View More Benefits", "sortedList": 7, "value": ""};
        plan.prodList.push(productData);
        console.log("New list: ",plan.prodList);
    }

        //sort based on ProductOrder__Rating
    function sortOnProductOrderRating(newPlans){
        newPlans.sort(function(a,b){
            if(a["CalculatedPriceData"]["ProductOrder__Rating"]<b["CalculatedPriceData"]["ProductOrder__Rating"]){
                return -1;
            }else if(a["CalculatedPriceData"]["ProductOrder__Rating"]>b["CalculatedPriceData"]["ProductOrder__Rating"]){
                return 1;
            }else{
                return 0;
            }
        });
    }

    function ifReverse(){
        try{
        let stmAcc=$scope.bpTree.response.HelpMeShop.Questionaries.StatementAccurate;
        if(!stmAcc) return false;
        if(stmAcc==='PayLittle' || stmAcc==='PayLess'){
            return false;
        }else {
            return true;
        }
        }catch(e){
            console.log("Error Occoured",e);
            return false;
        }
        return false;
      
    }
    
}]);

vlocity.cardframework.registerModule.directive('insOsDropdownHandler', function($document) {
    'use strict';
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            let isFocused = false;
            const dropdownElement = angular.element(element.find('.nds-dropdown')[0]);
            const onClick = function(event) {
                const isChild = dropdownElement.has(event.target).length > 0;
                if (!isChild) {
                    scope.$apply(attrs.insOsDropdownToggle);
                    $document.off('click', onClick);
                    isFocused = false;
                }
            };
            element.on('click', function(e) {
                if (!isFocused) {
                    e.stopPropagation();
                    scope.$apply(attrs.insOsDropdownToggle);
                    $document.on('click', onClick);
                    isFocused = true;
                }
            });
        }
    };
});