/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/search', 'N/email', 'N/file', 'N/log', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/https', 'N/format'],
  function (search, email, file, log, record, runtime, serverWidget, https, format) {

    function onRequest(context) {
      const indexId = "./content/index.html";
      try {
        const request = context.request;
        const params = request.parameters;
        const fileform = params.fileform || false;
        const filemedia = params.fileformmedia || false;
        const ponumberso = params.ponumber;

        if (request.method === "POST") {


          // const recaptchaToken = params['g-recaptcha-response'];

          // if (!recaptchaToken) {
          //   context.response.write(JSON.stringify({
          //     success: false,
          //     message: 'Captcha required'
          //   }));
          //   return;
          // }

          // const secretKey = runtime.getCurrentScript().getParameter({
          //   name: 'custscript_recaptcha_secret'
          // });

          // const verificationResponse = https.post({
          //   url: 'https://www.google.com/recaptcha/api/siteverify',
          //   body: {
          //     secret: secretKey,
          //     response: recaptchaToken
          //   }
          // });

          // const verificationResult = JSON.parse(verificationResponse.body);

          // log.debug('reCAPTCHA verification result', verificationResult);

          // if (!verificationResult.success) {
          //   context.response.write(JSON.stringify({
          //     success: false,
          //     message: 'Captcha validation failed'
          //   }));
          //   return;
          // }

          let content;
          let rmaId;
          if (request.files.custpage_proof) {
            const fileId = saveFileForm(request);
            content = `
           <html>
             <head></head>
             <body>
               <script>
                 document.addEventListener("DOMContentLoaded", () => {
                   if(window.opener){
                     console.log(window.opener.pumpreg);
                     window.opener.pumpreg.proofofpurchase.value = '${fileId}';
                   }
                   setTimeout(() => {
                     window.close();
                   }, 1000);
                 });
               </script>
             </body>
           </html>`;
          } else if (request.files.custpage_evidence) {
            const fileId = saveFileFormMedia(request);
            content = `
           <html>
             <head></head>
             <body>
               <script>
                 document.addEventListener("DOMContentLoaded", () => {
                   if(window.opener){
                     console.log(window.opener.pumpreg);
                     window.opener.pumpreg.proofofmedia.value = '${fileId}';
                   }
                   setTimeout(() => {
                     window.close();
                   }, 1000);
                 });
               </script>
             </body>
           </html>`;
          } else {
            const scriptObj = runtime.getCurrentScript();
            const simpleWishesUrl = 'www.test.com'//scriptObj.getParameter({ name: "custscript_simplewishesurl" });
            content = `{"url": "${simpleWishesUrl}"}`;
          }
          var combinationData = {}
          if (params.createRMA) {
            mentxt = createCase(params)
            combinationData = {
              params: params,
              items: arrayitems,
              message: mentxt
            };
          } else {
            log.debug('repost', JSON.stringify(context))
            const soRec = getSalesOrderRecord(params);
            var mentxt = '';
            var arrayitems = [];
            if (soRec) {
              var orderDate = soRec.getValue({ fieldId: "trandate" });
              if (isCreatedWithinLast30Days(new Date(orderDate))) {
                const { itemsArray, genericItemsArray } = getItemDetailsArray(soRec);
                arrayitems = itemsArray;
                combinationData = {
                  params: params,
                  items: arrayitems,
                  message: mentxt
                };
              } else {
                mentxt = "We're sorry, but our return coverage applies only to orders placed within the first 30 days. For further assistance, please contact our customer service team."
                combinationData = {
                  params: params,
                  items: arrayitems,
                  message: mentxt
                };
              }
            } else {
              mentxt = "We're sorry, but we were unable to locate your sales order in our system. For assistance, please reach out to our customer service team."
              combinationData = {
                params: params,
                items: arrayitems,
                message: mentxt
              };
            }


          }
          rmaId = JSON.stringify(combinationData, null, 2);
          log.debug('rmaId New Data', rmaId);

          content = `{"url": ${rmaId}}`;
          context.response.write(content);


          //  log.debug('context', JSON.stringify(context));
        } else { // Method GET
          //  log.debug('context GET', JSON.stringify(context));
          if (fileform) {
            context.response.writePage(createFileForm());
          } else if (filemedia) {
            context.response.writePage(createFileMedia());
          } else {
            const index = file.load({ id: indexId });
            const content = index.getContents();
            context.response.write(content);
          }
        }
      } catch (ex) {
        log.debug("ERROR", JSON.stringify(ex.message, ex));
      }
    }

    function notify(params, rmaId) {
      const mail = params.email;
      email.send({
        author: 6116833, // RA Department prod
        recipients: mail,
        subject: "Return Claim",
        body: "Thank you for registering. Should you have any questions regarding your warranty please contact the Return Authorization Department (855) 316-3773",
        relatedRecords: { transactionId: rmaId }
      });
    }

    function createFileForm() {
      const form = serverWidget.createForm({
        title: "Pump Proof of Purchase",
        hideNavBar: true,
      });
      const field = form.addField({
        id: "custpage_proof",
        type: serverWidget.FieldType.FILE,
        label: "Proof of Purchase",
      });
      field.isMandatory = true;
      form.addSubmitButton({
        label: "Submit",
      });
      return form;
    }

    function createFileMedia() {
      const form = serverWidget.createForm({
        title: "Evidence",
        hideNavBar: true,
      });
      const field = form.addField({
        id: "custpage_evidence",
        type: serverWidget.FieldType.FILE,
        label: "Evidence",
      });
      field.isMandatory = true;
      form.addSubmitButton({
        label: "Submit",
      });
      return form;
    }

    function saveFileForm(request) {
      const fileObject = request.files.custpage_proof;
      fileObject.folder = 125465;
      const fileId = fileObject.save();
      return fileId;
    }

    function saveFileFormMedia(request) {
      const fileObject = request.files.custpage_evidence;
      fileObject.folder = -10;
      const fileId = fileObject.save();
      return fileId;
    }
    function isCreatedWithinLast30Days(orderDate) {
      var orderCreationDate = new Date(orderDate);
      var today = new Date();
      var differenceInMilliseconds = today - orderCreationDate;
      var differenceInDays = differenceInMilliseconds / (1000 * 60 * 60 * 24);
      return differenceInDays <= 30;
    }
    function getItemDetailsArray(salesOrder) {
      var itemsArray = [];
      const genericItemsArray = [];
      var itemCount = salesOrder.getLineCount({ sublistId: 'item' });
      for (var i = 0; i < itemCount; i++) {
        var itemDetails = {
          internalId: salesOrder.getSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          }),
          itemName: salesOrder.getSublistText({
            sublistId: 'item',
            fieldId: 'item',
            line: i
          }),
          level: salesOrder.getSublistValue({
            sublistId: 'item',
            fieldId: 'price',
            line: i
          }),
          amount: salesOrder.getSublistValue({
            sublistId: 'item',
            fieldId: 'amount',
            line: i
          }),
          rate: salesOrder.getSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: i
          }),
          qty: salesOrder.getSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i
          }),
          returnQty: 0
        };

        if (itemDetails.qty !== '' && itemDetails.qty !== null && itemDetails.qty > 0) {
          itemsArray.push(itemDetails);
        } else {
          genericItemsArray.push(itemDetails);
        }
      }
      log.debug("Data", JSON.stringify(itemsArray));
      log.debug("Data generic items", JSON.stringify(genericItemsArray));
      return { itemsArray, genericItemsArray };
    }
    function getSalesOrderRecord(params) {
      const refno = params.ponumber;
      log.debug('DEBUG - refno (params.ponumber):', refno + " " + refno.length);

      const createdSO = getSalesOrder(refno);
      log.debug('DEBUG - createdSO:', createdSO);


      if (createdSO) {
        const soRec = record.load({
          type: 'salesorder',
          id: createdSO
        });
        return soRec
      } else null

    }

    // function createCaseRMA(params) {
    //   log.debug("parameters All", JSON.stringify(params));
    //   const product = params.product;
    //   const refno = params.ponumber;
    //   const isusseCode = params.issuecode;
    //   const createdSO = getSalesOrder(refno);
    //   const selectedItems = JSON.parse(params.selectedItems);
    //   var numtrans = '';

    //   const soRec = getSalesOrderRecord(params);
    //   if (soRec) {
    //     log.debug("no exist rmas");

    //     const rmaRecord = record.transform({
    //       fromType: record.Type.SALES_ORDER,
    //       fromId: createdSO,
    //       toType: record.Type.RETURN_AUTHORIZATION,
    //       isDynamic: true
    //     });
    //     rmaRecord.setValue({
    //       fieldId: 'customform',
    //       value: 174
    //     });

    //     rmaRecord.setValue({
    //       fieldId: "memo",
    //       value: params.reasonmemo
    //     });
    //     rmaRecord.setValue({
    //       fieldId: "class",
    //       value: 6
    //     }); // Ecommerce Class
    //     rmaRecord.setValue({
    //       fieldId: "custbody_review_code",
    //       value: isusseCode
    //     });

    //     const lineCount = rmaRecord.getLineCount({ sublistId: 'item' });
    //     for (let i = lineCount - 1; i >= 0; i--) {
    //       rmaRecord.removeLine({ sublistId: 'item', line: i });
    //     }

    //     const { itemsArray, genericItemsArray } = getItemDetailsArray(soRec);
    //     const itemsResult = selectedItems.map(selectedItem => {
    //       const match = itemsArray.find(item => item.internalId === selectedItem.internalId);
    //       return match ? { ...match, ...selectedItem } : selectedItem;
    //     });

    //     itemsResult.forEach(item => {
    //       log.debug('item data', item)
    //       rmaRecord.selectNewLine({ sublistId: 'item' });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.internalId });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.returnQty });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: item.level, });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: item.amount, });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.rate, });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: 1185, });
    //       rmaRecord.commitLine({ sublistId: 'item' });
    //     });

    //     const subtotalItem = genericItemsArray.find(i => i.itemName === 'Subtotal');
    //     const discountItem = genericItemsArray.find(i => i.itemName === 'FARAPP_GENERIC_DISCOUNT');

    //     if (subtotalItem) {
    //       rmaRecord.selectNewLine({ sublistId: 'item' });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: subtotalItem.internalId });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: subtotalItem.level, });
    //       rmaRecord.commitLine({ sublistId: 'item' });
    //     }

    //     if (discountItem) {
    //       rmaRecord.selectNewLine({ sublistId: 'item' });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: discountItem.internalId });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: discountItem.amount });
    //       rmaRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: discountItem.rate });
    //       rmaRecord.commitLine({ sublistId: 'item' });
    //     }

    //     try {
    //       rmaRecord.setValue({
    //         fieldId: "tobeemailed",
    //         value: false
    //       });
    //       const idRMA = rmaRecord.save({
    //         ignoreMandatoryFields: true
    //       });
    //       if (idRMA) {
    //         const RMArecord = record.load({
    //           type: "returnauthorization",
    //           id: idRMA
    //         });
    //         var tranid = RMArecord.getValue({ fieldId: 'tranid' });
    //         numtrans = `Thank you for submitting your return request. Your Return Material Authorization (RMA) has been successfully created. If you have any questions, feel free to contact our customer service team.  This is your confirmation code ${tranid}`
    //         sendRMAEmail(numtrans, idRMA);
    //         notify(params, idRMA);
    //         log.debug("Email sent and RMA created");
    //       }
    //     } catch (error) {
    //       log.error('Error creating RMA', error);
    //     }
    //   }
    //   return numtrans;
    // }
    function getSOData(salesOrderId) {
      try {
        const soData = search.lookupFields({
          type: search.Type.SALES_ORDER,
          id: salesOrderId,
          columns: ['entity', 'saleseffectivedate']
        });

        const customerId = soData.entity?.[0]?.value || null;
        const salesEffectiveDate = soData.saleseffectivedate || null;

        return {
          customerId,
          salesEffectiveDate
        };
      } catch (e) {
        log.error('getSOData error', e);
        return null;
      }
    }
    function createCase(params) {
      log.debug("parameters All", JSON.stringify(params));
      // const product = params.product;
      const refno = params.ponumber;
      const isusseCode = params.issuecode;
      const salesOrderId = getSalesOrder(refno);
      const selectedItems = params.selectedItems;
      // log.debug('items json', params.selectedItems);
      var numtrans = '';

      // const soRec = getSalesOrderRecord(params);
      const { customerId, salesEffectiveDate } = getSOData(salesOrderId);
      const parsedDate = format.parse({
        value: salesEffectiveDate,
        type: format.Type.DATE
      });


      if (salesOrderId && customerId) {
        // log.debug("SO data", customerId + ' ' + salesEffectiveDate);

        try {
          const caseRecord = record.create({
            type: record.Type.SUPPORT_CASE,
            isDynamic: false
          });

          caseRecord.setValue({
            fieldId: 'customform',
            value: 130 // Case RMA Form
          });
          caseRecord.setValue({
            fieldId: 'company',
            value: customerId
          });
          caseRecord.setValue({
            fieldId: 'title',
            value: 'Ticket created for Sales Order: #' + refno
          });
          caseRecord.setValue({
            fieldId: 'custevent_review_code',
            value: isusseCode
          });
          caseRecord.setValue({
            fieldId: 'custevent_case_items_lines_json',
            value: selectedItems
          });
          // caseRecord.setValue({
          //   fieldId: 'custevent_incident_type_type',
          //   value: 5 // RMA SB
          // });
          caseRecord.setValue({
            fieldId: 'profile',
            value: 2 // RMA SB
          });
          caseRecord.setValue({
            fieldId: 'assigned',
            value: 27 // Dilcia SB
          });
          caseRecord.setValue({
            fieldId: 'custevent_case_warranty_date_purchased',
            value: parsedDate
          });
          caseRecord.setValue({
            fieldId: 'custevent_case_rel_so',
            value: salesOrderId
          });

          const caseId = caseRecord.save();
          log.debug('Case created', caseId);

          const caseLookup = search.lookupFields({
            type: search.Type.SUPPORT_CASE,
            id: caseId,
            columns: ['casenumber']
          });
          const caseNumberText = caseLookup.casenumber;
          numtrans = `The Tikect: ${caseNumberText} requires further evaluation for Return Authorization (RMA).`;
          sendRMAEmail(numtrans, caseNumberText);
          // notify(params, caseId);
          log.debug("Email sent and RMA created");
        } catch (e) {
          log.error('createCase error', e);
        }

      }
      return `Thank you for submitting your Return Material Authorization (RMA) request. We have received your request, and our team will review it.<br><br>Please allow us up to 24 hours to review your request. If additional information is needed, we will contact you with the next steps.<br><br>Please do not ship any items back until you receive further instructions or an approved RMA number from our team. Sending products before receiving an approved RMA may result in delays and could increase the risk of your package being misplaced or lost during the return process.<br><br>If you have any questions in the meantime, please feel free to contact our Customer Service team at ra@spectrababyusa.com.<br><br>Thank you for your patience and cooperation.`;
    }

    function sendRMAEmail(numtrans, caseNumberText) {
      try {
        const bodyAll = "New RMA Ticket created " + numtrans;
        const subject = `New Ticket Created: ${caseNumberText}`;
        email.send({
          author: 6116833, // RA Department prod
          recipients: "ra@spectrababyusa.com",
          subject: subject,
          body: bodyAll,
          // relatedRecords: { transactionId: rmaId }
        });
      } catch (error) {
        log.error(error.message, JSON.stringify(error));
      }
    }

    function getSalesOrder(refno) {
      try {
        refno = refno.trim();
        const filter = refno.includes('SO') ? ["numbertext", "is", refno] : ["otherrefnum", "equalto", refno];
        log.debug('getSalesOrder - Start', 'Reference Number: ' + refno);
        log.debug('getSalesOrder - filter', filter);

        const salesorderSearchObj = search.create({
          type: "salesorder",
          settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
          filters: [
            ["type", "anyof", "SalesOrd"],
            "AND",
            ["mainline", "is", "T"],
            "AND",
            filter,
          ],
          columns: [
            search.createColumn({ name: "internalid" })
          ]
        });

        let idSO = null;
        salesorderSearchObj.run().each(result => {
          idSO = result.getValue("internalid");
          log.debug("getSalesOrder - Match Found", "Internal ID: " + idSO);
          return true;
        });

        if (!idSO) {
          log.debug("getSalesOrder - No Match Found", "No Sales Order found with refno: " + refno);
        }

        return idSO;
      } catch (error) {
        log.error("getSalesOrder - Error", error.message + " | Details: " + JSON.stringify(error));
      }
    }



    return {
      onRequest: onRequest
    };
  });
