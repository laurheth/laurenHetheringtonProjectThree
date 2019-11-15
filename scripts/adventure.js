const adventureApp = {
    $imgContainer: null,
    $descriptionBox: null,
    $actionBox: null,
    $itemBox: null,
    $locationTitle: null,
    itemDictionary: {},

    doneActions: {},

    // Game data! This object will be a beast to write, so I hope you enjoy it.
    data: null,

    // Player data
    player: {
        location: 'dungeonCell',
        inventory: {},
        flags: {},
        checkCondition: function(condition) {
            return condition in this.inventory || condition in this.flags;
        },
        
        add: function(type, item) {
            if (type in this && typeof this[type] === 'object') {
                if (item in this[type]) {
                    this[type][item]++;
                }
                else {
                    this[type][item]=1;
                }
            }
        },
        remove: function(type, item, all=false) {
            if (type in this && typeof this[type] === 'object') {
                if (item in this[type]) {
                    this[type][item]--;
                    if (this[type][item] <= 0 || all) {
                        delete this[type][item];
                    }
                }
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
        let locationObj = this.data[this.player.location];
        this.$locationTitle.text(locationObj.name);
        let description = '';
        if (lastActionMessage !== '') {
            description += `<p class="lastAction">${lastActionMessage}</p>`;
        }
        if (forceDescription !== '') {
            description += `<p>${forceDescription}</p>`;
        }
        if (includeDescription) {
            description += `<p>${locationObj.description}</p>`;
        }
        this.$imgContainer.html(`<img src=${locationObj.img} alt="Image of the current location.">`);

        this.$actionBox.empty();
        
        let actionList;
        if (forceActionList) {
            actionList = forceActionList;
        }
        else {
            actionList = locationObj.actions;
            // Item related actions, only if getting default room actions and not interacting with another item
            if (item==='') {
                // locationObj.items.forEach((item) => {

                // });
                for (let item in locationObj.items) {
                    // console.log(item);
                    if ('description' in locationObj.items[item]) {
                        description += `<p>${locationObj.items[item].description}</p>`;
                    }
                    this.addToActions(`${this.data.examineAction} ${item}.`,`item`,item);
                    // this.$actionBox.append(`
                    //     <li>
                    //         <a class="item" data-item="${item}" href="#">
                    //             ${this.data.examineAction} ${item}.
                    //         </a>
                    //     </li>
                    // `)

                }
            }
        }
        // Using an arrow function to keep this === the this I want (adventureApp)
        actionList.filter((action) => {
            // Exclude actions requiring an item in your inventory
            if (!forceActionList) {
                if ('if' in action && (action.if[0] in this.player.inventory) && !(action.if[0] === item)) {
                    return false;
                }
                // If interacting with an item, exclude actions not involving the item
                if (item !== '') {
                    if ('if' in action && !(action.if[0] === item) || !('if' in action)) {
                        return false;
                    }
                }
            }
            return this.checkValidity(action);
        }).forEach((action) => {
            if ('description' in action) {
                description += `<p>${action.description}</p>`;
            }
            this.addToActions(action.action,`action`);
            // const actionElement = `
            // <li>
            //     <a class="action" href="#">
            //         ${action.action}
            //     </a>
            // </li>
            // `;
            // this.$actionBox.append(actionElement);
        });

        // Did the player just look around a bit?
        if (includeDescription) {
            // Yup
            // this.player.add('flags','justLooked');
        }
        else {
            // Nope! Include this option!
            // this.player.remove('flags','justLooked',true);
            this.addToActions(this.data.lookAction,`action`);
            // this.$actionBox.append(`
            //     <li>
            //         <a class="action" href="#">
            //             ${this.data.lookAction}
            //         </a>
            //     </li>
            // `);
        }

        // Force room description if for some reason that's NOTHING, because nothing sucks.
        if (description === '') {
            description += `<p>${locationObj.description}</p>`;
        }
        this.$descriptionBox.html(description);

        this.$itemBox.empty();
        if (Object.keys(this.player.inventory).length>0) {
            Object.keys(this.player.inventory).forEach((item) => {
                this.$itemBox.append(`
                    <li>
                        <a class="item" data-item="${item}" href="#">
                            ${item}
                        </a>
                    </li>
                `)
            });
        } 
        else {
            this.$itemBox.append(`<li>${this.data.emptyPockets}</li>`);
        }
    },

    doAction: function(actionDone) {
        // console.log(actionDone);
        // Special case, "look around"
        if (actionDone.trim() === this.data.lookAction) {
            this.display(`You ${this.data.lookAction.toLowerCase()}...`, true);
            return;
        }

        // Special case, pick up
        if (actionDone.trim().indexOf(this.data.pickupAction) === 0) {
            // pick up the item, as expected
            const itemRegex = new RegExp(`${this.data.pickupAction} ([a-z]+).`,'i');
            const item = actionDone.match(itemRegex)[1];
            console.log(item);
            this.player.add('inventory',item);
            this.itemDictionary[item] = this.data[this.player.location].items[item].itemDescription;
            delete this.data[this.player.location].items[item];
            this.display(`You ${actionDone.toLowerCase()}`,false);
            return;
        }

        // Figure out action and then run it from the room list
        let action=null;
        this.data[this.player.location].actions.forEach((act) => {
            if (act.action === actionDone.trim() && this.checkValidity(act)) {
                action = act;
            }
        });
        let forceDescription='';
        if (action !== null) {
            if (!('examineRoom' in action)) {
                action.examineRoom=false;
            }
            if ('addInventory' in action) {
                this.player.add('inventory',action.addInventory);
                this.itemDictionary[action.addInventory] = this.data[this.player.location].items[action.addInventory].itemDescription;
                delete this.data[this.player.location].items[action.addInventory];
            }
            if ('removeInventory' in action) {
                this.player.remove('inventory',action.removeInventory);
            }
            if ('addFlag' in action) {
                this.player.add('flags',action.addFlag);
            }
            if ('removeFlag' in action) {
                this.player.remove('flags',action.removeInventory);
            }
            if ('setLocation' in action) {
                this.player.location = action.setLocation;
                action.examineRoom=true;
            }
            if ('forceDescription' in action) {
                forceDescription = action.forceDescription;
            }
            this.display(`${action.result}`,action.examineRoom,null,forceDescription);
        }
    },

    itemInteract: function(item) {
        const actionString = `You ${this.data.examineAction.toLowerCase()} the ${item}...`;
        let itemActionList = null;
        let itemDescription='';
        console.log(item);
        if ('items' in this.data[this.player.location] && item in this.data[this.player.location].items) {
            itemDescription = this.data[this.player.location].items[item].itemDescription;
            if (this.data[this.player.location].items[item].canPickUp) {
                itemActionList = [{
                    action: `${this.data.pickupAction} ${item}.`,
                    result: this.data[this.player.location].items[item].result,
                    addInventory: item,
                }];
            }
        }
        if (item in this.itemDictionary) {
            itemDescription = this.itemDictionary[item];
        }
        // console.log('sdfg');
        this.display(actionString,false,itemActionList,itemDescription,item);
    },

    addToActions: function(action, type, item='') {
        let symbol=`<i class="far fa-square"></i>`;
        let method='prepend';
        if (this.player.location in this.doneActions) {
            if (action.trim() in this.doneActions[this.player.location]) {
                symbol=`<i class="far fa-check-square"></i>`;
                method='append';
            }
        }
        console.log(action, method);
        this.$actionBox[method](`
                <li>
                    <span>${symbol}</span>
                    <a ${(type==='item') ? 'data-item="'+item+'"' : ''} class="${type}" href="#">
                        ${action}
                    </a>
                </li>
            `);
    },

    events: function() {
        $('#actionBox').on('click','a.action',function(event) {
            event.preventDefault();

            if (!(adventureApp.player.location in adventureApp.doneActions)) {
                adventureApp.doneActions[adventureApp.player.location] = {};
            }
            adventureApp.doneActions[adventureApp.player.location][$(this).text().trim()]=true;

            adventureApp.doAction($(this).text());
        });

        $('#actionBox, #itemBox').on('click', 'a.item', function(event) {
            event.preventDefault();

            if (!(adventureApp.player.location in adventureApp.doneActions)) {
                adventureApp.doneActions[adventureApp.player.location] = {};
            }
            adventureApp.doneActions[adventureApp.player.location][$(this).text().trim()]=true;

            const itemName = $(this).data('item');
            adventureApp.itemInteract(itemName);
        })
    },

    loadGameData: function() {
        $.ajax({
            url: 'data/gameData.json',
            method: 'GET',
            dataType: 'json'
        }).then((result) => {
            $('#curtain').fadeOut('slow');
            this.data=result;
            this.startGame();
        })
    },

    startGame: function() {
        this.events();
        $('h1').text(this.data.gameName);
        window.document.title=this.data.gameName;
        this.display(`You awaken after what feels like a very long slumber...`);
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