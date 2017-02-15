# OpenUI5-SAPUI5-CRUDModel

[OpenUI5](http://openui5.org/)/[SAPUI5](https://sapui5.hana.ondemand.com) Model implementation for [mevdschee/php-crud-api](https://github.com/mevdschee/php-crud-api)

## Setup in UI5
1. Add the CRUDModel.js file to you project folder library/bd/model/
2. In your Component.js file add the following lines
```javascript
jQuery.sap.registerModulePath("nl.barrydam", "library/bd/");
jQuery.sap.require("nl.barrydam.model.CRUDModel");
```

## Contructor
**new nl.barrydam.model.CRUDModel(sServiceUrl, mParameters?)**

Constructor for a new CRUDModel.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sServiceUrl** 					| Base uri of the service to request data from; additional URL parameters appended here will be appended to every request can be passed with the mParameters object as well
*{object}*			| **mParameters?**					| (optional) a map which contains the following parameter properties:
*{string}*			| **mParameters.bindingMode?**		| Set the binding mode for the model (OneWay or TwoWay, default = TwoWay)
*{string}*			| **mParameters.user?**				| User for the service
*{string}*			| **mParameters.password?**			| Password for service
*{string}*			| **mParameters.primaryKey?**		| Database primary key (default = 'id')
*{map}*				| **mParameters.serviceUrlParams?**	| Map of URL parameters - these parameters will be attached to all requests
*{boolean}*			| **mParameters.useBatch?**			| When true all POST PUT and DELETE requests will be sent in batch requests (default = false)

## Events
The following events can be triggered by the CRUDModel: Login, Logout, MetadataFailed, MetadataLoaded, Reload.

You can catch them by using the following methods: attachLogin, attachLogout, attachMetadataFailed, attachMetadataLoaded, attachReload.

Or once: You can catch them by using the following methods: attachLoginOnce, attachLogoutOnce, attachMetadataFailedOnce, attachMetadataLoadedOnce, attachReloadOnce.

**Example**
```javascript
oCRUD.attachLogin(function() {
	alert("User has logged in");
});
```

## Method detail

[clearBatch](#clearBatch),
[create](#create),
[createBatchOperation](#createBatchOperation),
[createEntry](#createEntry),
[hasPendingChanges](#hasPendingChanges),
[login](#login),
[logout](#logout),
[read](#read),
[setProperty](#setProperty),
[submitChanges](#submitChanges),
[resetChanges](#resetChanges),
[reload](#reload),
[remove](#remove),
[update](#update)


###clearBatch()
Removes all operations in the current batch.

###create(sPath, oData, mParmeters?)
Trigger a POST request to the CRUD service that was specified in the model constructor. Please note that deep creates are not supported and may not work. 

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{object}*			| **oData** 						| Data of the entry that should be created.
*{map}*				| **mParameters?** 					| Optional parameter map containing any of the following properties:created.
*{function}*		| **mParameters.success?** 			| A callback function which is called when the data has been successfully retrieved. The handler can have the following parameters: oData and response.created.
*{function}*		| **mParameters.error?** 			| a callback function which is called when the request failed. The handler can have the parameter oError which contains additional error information.
*{boolean}*			| **mParameters.async?** 			| Whether the request should be done asynchronously. Default: false Please be advised that this feature is officially unsupported as using asynchronous requests can lead to data inconsistencies if the application does not make sure that the request was completed before continuing to work with the data.

###createBatchOperation(sPath, sMethod, oData?)
Creates a single batch operation (read or change operation) which can be used in a batch request.

**Parameters:**

Type 				| Variable 							| Description
--- 				| --- 								| ---
*{string}*			| **sPath** 						| 	A string containing the path to the collection where an entry should be created. The path is concatenated to the sServiceUrl which was specified in the model constructor.
*{string}*			| **sMethod** 						| for the batch operation. Possible values are GET, PUT, MERGE, POST, DELETE
*{object}*			| **oData?** 						| optional data payload which should be created, updated, deleted in a change batch operation.

###createEntry


###hasPendingChanges


###login


###logout


###read


###setProperty


###submitChanges


###resetChanges


###reload


###remove


###update



## BUY ME A BEER
[![PayPayl donate button](https://img.shields.io/badge/paypal-donate-yellow.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=XX68BNMVCD7YS "Donate once-off to this project using Paypal")