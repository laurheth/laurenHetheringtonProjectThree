const adventureApp = {
    // jQuery objects for containers that will be accessed more than once
    $imgContainer: null,
    $descriptionBox: null,
    $actionBox: null,
    $itemBox: null,
    $locationTitle: null,

    lastSetImage:"",

    // This object gets populated by item descriptions, as the player acquires them.
    itemDictionary: {},

    // This object gets populated with actions and the locations they were performed in, to help the player not repeat actions.
    doneActions: {},

    // Game data! Null as a placeholder, but will be filled with game data by this.loadGameData
    data: null,

    // Player data
    player: {
        // Where are they now?
        location: '',
        // What's in their pockets?
        inventory: {},
        // Checked items?
        inventoryChecked: {},
        // Flags to keep track of (i.e. has a door been opened? Is the light switch on?)
        flags: {},

        // Check if a particular condition applies (is present in inventory OR flags)
        checkCondition: function(condition) {
            return condition in this.inventory || condition in this.flags;
        },
        
        // Add to inventory or flags
        add: function(type, items) {
            if (type in this && typeof this[type] === 'object') {
                if (!Array.isArray(items)) {
                    items = [items];
                }
                items.forEach((item) => {
                    if (item in this[type]) {
                        this[type][item]++;
                    }
                    else {
                        this[type][item]=1;
                    }
                });
            }
        },
        // Remove from inventory or flags. If all=true, remove all of item.
        remove: function(type, items, all=false) {
            if (type in this && typeof this[type] === 'object') {
                if (!Array.isArray(items)) {
                    items = [items];
                }
                items.forEach((item) => {
                    if (item in this[type]) {
                        this[type][item]--;
                        if (this[type][item] <= 0 || all) {
                            delete this[type][item];
                        }
                    }
                });
            }
        },
    },

    // Check validity of an action
    checkValidity: function(action) {
        let conditionsMet=true;
        if ('if' in action) {
            action.if.forEach((condition) => {
                conditionsMet &= this.player.checkCondition(condition);
            });
        }
        if ('ifNot' in action) {
            action.ifNot.forEach((condition) => {
                conditionsMet &= !(this.player.checkCondition(condition));
            });
        }
        return conditionsMet;
    },

    // Display room. Prepend with the result of the previously taken action.
    display: function(lastActionMessage='',includeDescription=true, forceActionList=null, forceDescription='', item='') {
        // Save reference to the current location because we're going to be referencing it a lot
        let locationObj = this.data[this.player.location];

        let imgSrc=locationObj.img;
        let imgAlt=locationObj.imgAlt;

        // Title of the current location
        this.$locationTitle.text(locationObj.name);
        let description = '';
        // If a lastActionMessage was included, add it FIRST
        if (lastActionMessage !== '') {
            description += `<p class="lastAction">${lastActionMessage}</p>`;
        }
        // If some additional description is included via forceDescription, add it in nest
        if (forceDescription !== '') {
            if (!Array.isArray(forceDescription)) {
                forceDescription = [forceDescription];
            }
            forceDescription.forEach((text) => {
                description += `<p>${text}</p>`;
            });
        }
        // If including the full room description, add it
        if (includeDescription) {
            if ('description' in locationObj) {
                description += `<p>${locationObj.description}</p>`;
            }
            if ('conditionalDescriptions' in locationObj) {
                locationObj.conditionalDescriptions.forEach((thisDescription) => {
                    if (this.checkValidity(thisDescription)) {
                        if ('description' in thisDescription) {
                            description += `<p>${thisDescription.description}</p>`;
                        }
                        if ('img' in thisDescription) {
                            imgSrc = thisDescription.img;
                            imgAlt = thisDescription.imgAlt;
                        }
                    }
                });
            }
        }

        // Update the image
        const imageUpdated = this.updateImage(imgSrc,imgAlt);

        // Empty the action box before we repopulate it
        this.$actionBox.empty();
        
        let actionList;
        // forceActionList is used to provide an alternate list of actions. Use it instead of the usual action list if it exists
        if (forceActionList) {
            actionList = forceActionList;
        }
        else {
            actionList = locationObj.actions;
            // Item related actions, only if getting default room actions and not interacting with another item
            if (item==='') {
                for (let item in locationObj.items) {
                    // If 'description' is present, add to the main room description (i.e. a key is on the floor here)
                    if ('description' in locationObj.items[item]) {
                        description += `<p>${locationObj.items[item].description}</p>`;
                    }
                    // Add to actions list
                    this.addToActions(`${this.data.examineAction} ${item}.`,`item`,item);
                }
            }
        }
        // Using an arrow function to keep this === the this I want (adventureApp)
        actionList.filter((action) => {
            // If forceActionList is given, use it, no matter what (though still check for validity)
            if (!forceActionList) {
                // If interacting with an item...
                if (item !== '') {
                    // exclude actions not involving the item
                    if ('if' in action && !(action.if.includes(item)) || !('if' in action)) {
                        return false;
                    }
                    if (!('needsItem' in action && action.needsItem)) {
                        return false;
                    }
                }
                else {
                    // if not interacting with an item, exlude actions requiring an item
                    if ('needsItem' in action && action.needsItem) {
                        return false;
                    }
                }
            }
            return this.checkValidity(action);
        }).forEach((action) => {
            // If 'description' is present, add to the main room description (i.e. a key is on the floor here)
            if ('description' in action) {
                description += `<p>${action.description}</p>`;
            }
            // Add to actions list
            this.addToActions(action.action,`action`);
        });

        // If the player didn't just look around a bit, add a "look around" action
        if (!(includeDescription)) {
            this.addToActions(this.data.lookAction,`action`);
        }

        // Force room description if for some reason that's NOTHING, because nothing is boring.
        if (description === '') {
            description += `<p>${locationObj.description}</p>`;
        }

        // Display fully constructed description
        this.$descriptionBox.html(description);

        // Add list of items, or empty pockets message if no items held.
        this.$itemBox.empty();
        if (Object.keys(this.player.inventory).length>0) {
            Object.keys(this.player.inventory).forEach((item) => {
                this.addToItems(item);
            });
        } 
        else {
            this.$itemBox.append(`<li>${this.data.emptyPockets}</li>`);
        }

        // Figure out scrolling
        let offset=0;
        // If the image has updated, we want to be able to see the image
        if (imageUpdated) {
            offset = this.$imgContainer.offset().top;// - $(document).scrollTop();
        }
        // Otherwise, we mainly just want to see the text
        else {
            offset = this.$locationTitle.offset().top;// - $(document).scrollTop();
        }

        // Only scroll up if the player is currently scrolled past the chosen scroll-point
        if (offset < $(document).scrollTop()) {
            $(document).scrollTop(offset);
        }


    },

    // Main action parser. Accepts the text shown in the "actions" anchors.
    doAction: function(actionDone) {

        // Special case, "look around"
        if (actionDone.trim() === this.data.lookAction) {
            this.display(`You ${this.data.lookAction.toLowerCase()}...`, true);
            return;
        }

        // Special case, pick up
        if (actionDone.trim().indexOf(this.data.pickupAction) === 0) {
            // Get the item being picked up
            const itemRegex = new RegExp(`${this.data.pickupAction} ([a-z]+).`,'i');
            const item = actionDone.match(itemRegex)[1];
            // Add to the players inventory
            this.player.add('inventory',item);

            // Add the item definition to the dictionary
            this.itemDictionary[item] = this.data[this.player.location].items[item].itemDescription;

            let result='`You ${actionDone.toLowerCase()}`';
            
            if ('result' in this.data[this.player.location].items[item]) {
                result = this.data[this.player.location].items[item].result;
            }

            // Remove for the room items list; no picking it up twice!
            delete this.data[this.player.location].items[item];

            this.display(result,false);
            return;
        }

        // Figure out action and then run it from the room list
        let action=null;
        this.data[this.player.location].actions.forEach((act) => {
            // The chosen action is the one that matches the text, and is also valid
            if (act.action === actionDone.trim() && this.checkValidity(act)) {
                action = act;
            }
        });
        let forceDescription='';
        // Was an action found? If so, do it
        if (action !== null) {
            // Do we want to examine the room? Default to false
            if (!('examineRoom' in action)) {
                action.examineRoom=false;
            }
            // Are we adding an inventory item via the action?
            if ('addInventory' in action) {
                this.player.add('inventory',action.addInventory);
                if ('itemDescription' in action) {
                    this.itemDictionary[action.addInventory] = action.itemDescription;
                }
                else {
                    this.itemDictionary[action.addInventory] = `This is a ${action.addInventory}.`;
                }
            }
            let removeAll=false;
            if ('removeAll' in action && action.removeAll) {
                removeAll=true;
            }
            // Does this remove inventory items?
            if ('removeInventory' in action) {
                this.player.remove('inventory',action.removeInventory,removeAll);
            }
            // Does this add a flag?
            if ('addFlag' in action) {
                this.player.add('flags',action.addFlag);
            }
            // Does this remove a flag?
            if ('removeFlag' in action) {
                this.player.remove('flags',action.removeFlag,removeAll);
            }
            // Does this move the player to a new location?
            if ('setLocation' in action) {
                this.player.location = action.setLocation;
                // ALWAYS examine new rooms!
                action.examineRoom=true;
            }
            // Does this action force a description?
            if ('forceDescription' in action) {
                forceDescription = action.forceDescription;
            }

            // Does this action check any inventory items?
            if ('checkInventory' in action) {
                if (!Array.isArray(action.checkInventory)) {
                    action.checkInventory = [action.checkInventory];
                }
                action.checkInventory.forEach( (item) => {
                    this.player.inventoryChecked[item]=true;
                })
            }

            // Reset all player items and flags
            if ('resetAll' in action) {
                this.player.inventory = {};
                this.player.inventoryChecked = {};
                this.player.flags = {};
                this.doneActions = {};
                this.loadGameData();
            }
            else {
                // Done. Run the display method.
                this.display(`${action.result}`,action.examineRoom,null,forceDescription);
            }

        }
    },

    // Main item interaction.
    // At this time, this is almost always for examining an item.
    itemInteract: function(item) {
        const actionString = `You ${this.data.examineAction.toLowerCase()} the ${item}...`;
        let itemActionList = null;
        let itemDescription='';

        // Is the item part of the room? Get description from there.
        if ('items' in this.data[this.player.location] && item in this.data[this.player.location].items) {
            itemDescription = this.data[this.player.location].items[item].itemDescription;
            // Can it be picked up? Add a pickup action.
            if (this.data[this.player.location].items[item].canPickUp) {
                itemActionList = [{
                    action: `${this.data.pickupAction} ${item}.`,
                    result: this.data[this.player.location].items[item].result,
                    addInventory: item,
                }];
            }
        }
        // Is the item in the item dictionary? Get the definition from there.
        if (item in this.itemDictionary) {
            itemDescription = this.itemDictionary[item];
        }

        // Done. Run the display.
        this.display(actionString,false,itemActionList,itemDescription,item);
    },

    // Append to the list of actions
    addToActions: function(action, type, item='') {
        // Default symbol
        let symbol=`<i class="far fa-square"></i>`;
        // Default to prepending.
        let method='prepend';

        // Has the action been done before, at this location?
        if (this.player.location in this.doneActions) {
            if (action.trim() in this.doneActions[this.player.location]) {
                // Switch to the "done" symbol and append instead of prepend.
                symbol=`<i class="far fa-check-square"></i>`;
                method='append';
            }
        }

        // Add to the action box.
        this.$actionBox[method](`
                <li>
                    <a ${(type==='item') ? 'data-item="'+item+'"' : ''} data-action="${action}" class="${type}" href="#">
                        ${symbol}
                        ${action}
                    </a>
                </li>
            `);
    },

    // Append to list of items
    addToItems: function(item) {
        // Default symbol
        let symbol=`<i class="far fa-square"></i>`;
        // Default to prepending.
        let method='prepend';

        // Has the action been done before, at this location?
        if (item in this.player.inventoryChecked && this.player.inventoryChecked[item]) {
            // Switch to the "done" symbol and append instead of prepend.
            symbol=`<i class="far fa-check-square"></i>`;
            method='append';
        }
        this.$itemBox[method](`
            <li>
                <a class="item" data-item="${item}" data-action="${item}" href="#">
                    ${symbol}
                    ${item}
                </a>
            </li>
        `)
    },

    // Update image
    updateImage: function(imgSrc, alt=`Image of the current location.`) {
        if (imgSrc !== this.lastSetImage) {
            this.$imgContainer.html(`<img src=${imgSrc} alt="${alt}">`);
            this.lastSetImage = imgSrc;
            return true;
        }
        return false;
    },

    // Update doneActions
    updateDoneActions: function(action) {
        if (!(this.player.location in this.doneActions)) {
            this.doneActions[this.player.location] = {};
        }
        this.doneActions[this.player.location][action.trim()]=true;
    },

    // Get action done
    getActionText: function($anchor) {
        if ($anchor.data('action')) {
            return $anchor.data('action').trim();
        }
        else {
            return $anchor.text();
        }
    },

    // Events listeners
    events: function() {
        // Actions
        $('#actionBox').on('click','a.action',function(event) {
            event.preventDefault();

            const actionDone = adventureApp.getActionText($(this));

            // Has it been done before? If not, add it to doneActions.
            adventureApp.updateDoneActions(actionDone);

            // Do the action!
            adventureApp.doAction(actionDone);
        });

        // Item interactions
        $('#actionBox, #itemBox').on('click', 'a.item', function(event) {
            event.preventDefault();

            const actionDone = adventureApp.getActionText($(this));

            // Has it been done before? If not, add it to doneActions.
            adventureApp.updateDoneActions(actionDone);

            // Look at the item!
            const itemName = $(this).data('item');
            adventureApp.itemInteract(itemName);
        })
    },

    // Load game data from json.
    loadGameData: function() {
        $.ajax({
            url: 'data/gameData.json',
            method: 'GET',
            dataType: 'json'
        }).then((result) => {
            this.data=result;
            this.startGame();
        }).fail((error) => {
            // Something went wrong. Hide the loading messages and reveal the load error message.
            $('.loading').hide();
            $('.loadError').removeClass('loadError');
        })
    },
    
    // Start the game!
    startGame: function() {
        this.events();
        // Remove the "curtain"!
        $('#curtain').fadeOut('slow');
        // Set the game title!
        $('h1').text(this.data.gameName);
        window.document.title=this.data.gameName;

        this.player.location = this.data.startLocation;

        // Run the first display!
        if (!('firstMessage' in this.data)) {
            this.data.firstMessage="";
        }
        this.display(this.data.firstMessage);
    },

    // Init method
    init: function() {
        this.$imgContainer = $('#imgContainer');
        this.$descriptionBox = $('#descriptionBox');
        this.$actionBox = $('#actionBox');
        this.$itemBox = $('#itemBox');
        this.$locationTitle = $('#locationTitle');
        this.loadGameData();
    }
};

// Document ready
$(function() {
    adventureApp.init();
});