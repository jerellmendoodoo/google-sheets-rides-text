function isValidDate(d) {
  if ( Object.prototype.toString.call(d) !== "[object Date]" )
    return false;
  return !isNaN(d.getTime());
}

function syncCalendar() { 
  function convertDateToUTC(date) { return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); }
  var sheetTabName = "2 Weeks"; // Put the tab name here
  var calendarName = "GPNJ - What's Up Doc Calendar"; // Put the Calendar name here
  

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetTabName); 
  var myCalendar = CalendarApp.getCalendarsByName(calendarName)[0]; 
  if (!myCalendar) {
    myCalendar = CalendarApp.createCalendar(calendarName);
  }
  if( sheet == null || myCalendar == null) {return;}
  var firstColumn = "A";
  var lastColumn = "H";

  var hasExtraColumn1 = true;
  var descriptionText1 = "In Charge: "; // Modify these as needed for each column
  var hasExtraColumn2 = true;
  var descriptionText2 = "Food: ";
  var hasExtraColumn3 = true;
  var descriptionText3 = "Childcare: ";
  var hasExtraColumn4 = true;
  var descriptionText4 = "Notes: ";

  var columnRange = firstColumn + ":" + lastColumn;
  var allCells = sheet.getRange(columnRange).getValues();
  
  var numRows = sheet.getLastRow();
  var index = 0;
  var dateOnCell = null;
  var curDateValue = null;
  var eventName = null;
  var eventStart = null;
  var eventEnd = null;
  var eventLoc = null;
  var events = null;
  var toCreate = [];
  var matching = null;
  var firstDateValue = null;
  var missingEnd = false;
  var toDelete = {};
  var descriptionText; 
  var today = new Date();
  var threeDaysAgo = today.getTime() - 1000*60*60*24*3;
  
  while (index < numRows) {
    dateOnCell = allCells[index][0];
    if(isValidDate(dateOnCell)){
      var tempDate = convertDateToUTC(dateOnCell);
      if (tempDate.getTime() >= threeDaysAgo) {
        break;
      }
    }
    index++;
  }
  
  while( index < numRows)
  {
    //Fix for removing mon-fri events from displaying
    if (allCells[index][0].toString().toLowerCase().indexOf('mon-fri') != -1) {
      index++;
      while(allCells[index][0] == "") {
        index++;
      }
      Logger.log('continue');
      Logger.log(allCells[index][0]);
      continue;
    }
    dateOnCell = allCells[index][0];
    if(curDateValue != null || isValidDate(dateOnCell)){
      if(isValidDate(dateOnCell)){
        curDateValue = convertDateToUTC(dateOnCell);
        if (firstDateValue == null) {
          firstDateValue = curDateValue;
        }
      }
      
      if (typeof allCells[index][1] === "string") {
        var tempStartEndDateHolder = allCells[index][1].split('-');
        var a = tempStartEndDateHolder[0];
        eventStart = formatAmPmTime(curDateValue, tempStartEndDateHolder[0], tempStartEndDateHolder.length === 2? tempStartEndDateHolder[1] : tempStartEndDateHolder[0]);
        eventEnd = tempStartEndDateHolder.length === 2? tempStartEndDateHolder[1] : eventStart;
        eventEnd = formatAmPmTime(curDateValue, eventEnd, eventStart)
        eventEnd = !!eventEnd ? eventEnd : eventStart;
      } else {
        //sometimes when time is formatted IE: 6:00:00 PM - it puts an odd date = Sat Dec 30 1899 21:15:00 GMT-0500 (EST)
        //date hack - for some reason need to subtract 3 hours too..
        if (allCells[index][1].getUTCFullYear() < 2000) {
          eventStart = new Date(curDateValue.getUTCFullYear(), curDateValue.getUTCMonth(), curDateValue.getUTCDate(), allCells[index][1].getHours() - 3, allCells[index][1].getMinutes());
          eventEnd = eventStart;
        } else {
          eventStart = allCells[index][1];
          eventEnd = allCells[index][1];
        }
      }

      eventName = allCells[index][2];      
      if(eventStart == "") {
        index++;
        continue;
      }
      if (!isValidDate(eventStart)) {
        if (eventStart && eventStart.toString().toLowerCase().equals("all day")) {
          eventLoc = allCells[index][3];
          descriptionText = "";
          if (hasExtraColumn1) {
            descriptionText += descriptionText1 + allCells[index][4];
          }
          if (hasExtraColumn2) {
            descriptionText += "\n" + descriptionText2 + allCells[index][5];
          }
          if (hasExtraColumn3) {
            descriptionText += "\n" + descriptionText3 + allCells[index][6];
          }
          if (hasExtraColumn4) {
            descriptionText += "\n" + descriptionText4 + allCells[index][7];
          }
          eventEnd = new Date(curDateValue.getUTCFullYear(), curDateValue.getUTCMonth(), curDateValue.getUTCDate()+1, curDateValue.getHours(), 0);
          toCreate.push({name: eventName, start: curDateValue, end: eventEnd, 
                         options: {location: eventLoc, 
                                   description: descriptionText}, date: curDateValue, allDay: true});
          
        }
        index++;
        continue;
      }
      if (eventEnd == "") {
        eventEnd = new Date(eventStart);
        missingEnd = true;
      }

      // sometimes these have issues with timezones. You can use getUTCHours() and getUTCMinutes() if you're running into timezone issues
      eventStart = new Date(curDateValue.getUTCFullYear(), curDateValue.getUTCMonth(), curDateValue.getUTCDate(), eventStart.getHours(), eventStart.getMinutes());
      eventEnd = new Date(curDateValue.getUTCFullYear(), curDateValue.getUTCMonth(), curDateValue.getUTCDate(), eventEnd.getHours(), eventEnd.getMinutes());
      if (missingEnd) {
        eventEnd.setTime(eventStart.getTime() + 60*60*1000); // add an hour if no end time is set
        missingEnd = false;
      }
      if (eventEnd.getTime() < eventStart.getTime()) { //hack fix for when the end time is 12AM or something. Add 24 hours to move it to next day.
        eventEnd.setTime(eventEnd.getTime() + 1000*60*60*24);
      }
      eventLoc = allCells[index][3];
      descriptionText = "";
      if (hasExtraColumn1) {
        descriptionText += descriptionText1 + allCells[index][4];
      }
      if (hasExtraColumn2) {
        descriptionText += "\n" + descriptionText2 + allCells[index][5];
      }
      if (hasExtraColumn3) {
        descriptionText += "\n" + descriptionText3 + allCells[index][6];
      }
      if (hasExtraColumn4) {
        descriptionText += "\n" + descriptionText4 + allCells[index][7];
      }
      toCreate.push({name: eventName, start: eventStart, end: eventEnd, 
                     options: {location: eventLoc, 
                               description: descriptionText}, date: curDateValue, allDay: false});
    }
    index++;
  }
//  Logger.log(toCreate);
//  Logger.log(".................");
  while (firstDateValue.getTime() <= curDateValue.getTime() && toCreate.length > 0) {
    events = myCalendar.getEventsForDay(firstDateValue);
    for(var e in events){
      matching = null;
      for (var item in toCreate) {
        if (events[e].isAllDayEvent() && toCreate[item]['allDay'] == true) {
          if (toCreate[item]['date'].getTime() == firstDateValue.getTime() 
            && toCreate[item]['name'] == events[e].getTitle() 
            && events[e].getLocation() == toCreate[item]['options']['location']
            && events[e].getDescription() == toCreate[item]['options']['description']) {
              matching = toCreate[item];
              break;
            }
        }
        Logger.log(events[e].getTitle());
        if (toCreate[item]['date'].getTime() == firstDateValue.getTime() 
          && toCreate[item]['name'] == events[e].getTitle()
          && events[e].getStartTime().valueOf() == toCreate[item]['start'].valueOf()
          && events[e].getEndTime().valueOf() == toCreate[item]['end'].valueOf()
          && events[e].getLocation() == toCreate[item]['options']['location']
          && events[e].getDescription() == toCreate[item]['options']['description']) {
          matching = toCreate[item];
          break;
        }
      }
      if (matching == null && (events[e].getStartTime().valueOf() >= firstDateValue.getTime().valueOf() || events[e].isAllDayEvent())) { //calendar event not found, deleting 
        toDelete[events[e].getId()] = events[e];
      } else { //calendar event found, don't create (i.e. remove from create list)
        toCreate.splice(toCreate.indexOf(matching), 1);
      }
    }
    firstDateValue.setDate(firstDateValue.getUTCDate() + 1);
  }
//  Logger.log(toDelete);
//  Logger.log(toCreate);
  for (var e in toCreate) {
    if (toCreate[e]['allDay']) {
      myCalendar.createAllDayEvent(toCreate[e]['name'], toCreate[e]['date'], toCreate[e]['options']);
    } else {
      myCalendar.createEvent(toCreate[e]['name'], toCreate[e]['start'], toCreate[e]['end'], toCreate[e]['options']);
    }
  }
  for(var key in toDelete){
    toDelete[key].deleteEvent();
  }
}

// for debugging purposes. Delete all events in the last 8 days and 20 days from now
function clearAllEvents() {
  var myCalendar = CalendarApp.getCalendarsByName("GPNJ - What's Up Doc Calendar")[0];
  var now = new Date();
  events = myCalendar.getEvents(new Date(now.getTime() - 8*24*60*60*1000), new Date(now.getTime() + 20*24*60*60*1000));
  for(var e in events){
    events[e].deleteEvent();
  }
}

function isValidDate(d) {
  if ( Object.prototype.toString.call(d) !== "[object Date]" )
    return false;
  return !isNaN(d.getTime());
}

function formatAmPmTime(curDateValue, time, otherTime) {
  if (!time || !time[0] || time[0] === "Invalid Date" || !time[0].trim()) { return; } // TODO: fix parsing
  time = time.toString().toLowerCase();

  var am = time.substring(0, time.indexOf('a'))
  var pm = time.substring(0, time.indexOf('p'))
  var formattedTime = am || pm;
  if (!formattedTime) { // handle case where they forgot an am or pm, assume that it's the same as the other time 
    var isAm = otherTime.toString().toLowerCase().indexOf('a') !== -1;
    var isPm = otherTime.toString().toLowerCase().indexOf('p') !== -1;
    time = isAm ? time + "am" : time + "pm";
    am = time.substring(0, time.indexOf('a'))
    pm = time.substring(0, time.indexOf('p'))
    formattedTime = am || pm;
  }
  var formattedHours;
  var formattedMins;

  if (!!am) {
    var formattedHoursAndMinsAm = formattedTime.split(":");
    formattedHours = parseInt(formattedHoursAndMinsAm[0]);
    formattedMins = formattedHoursAndMinsAm.length === 2 ? parseInt(formattedHoursAndMinsAm[1]): 0;
  } else {
    var formattedHoursAndMinsPm = formattedTime.split(":");
    formattedHours = parseInt(formattedHoursAndMinsPm[0]);
    formattedHours = formattedHours != 12 ? formattedHours + 12: formattedHours; // if 12pm then leave it, if 1pm +, then add 12 to make it => 13:00, 14:00 etc.
    formattedMins = formattedHoursAndMinsPm.length === 2 ? parseInt(formattedHoursAndMinsPm[1]): 0;
  }
  
  
  return new Date(curDateValue.getUTCFullYear(), curDateValue.getUTCMonth(), curDateValue.getUTCDate(), formattedHours, formattedMins);
}

