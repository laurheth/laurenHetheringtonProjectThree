const adventureApp = {
    $imgContainer: null,
    $descriptionBox: null,
    $actionBox: null,
    $itemBox: null,
    $locationTitle: null,

    // Game data! This object will be a beast to write, so I hope you enjoy it.
    data: {
        gameName: "Escape from Project Three",
        lookAction: "Look around again.",
        emptyPockets: "Your pockets are empty.",
        dungeonCell: {
            name: 'Dungeon Cell',
            description: `You find yourself in a cold and dark dungeon cell. Moonlight comes in through the barred window, and dampness accumulates on the cold walls. You have no recollection of how you got here, but it probably kind of sucked.`,
            img: `https://placekitten.com/500/500`,
            actions: [
                {
                    ifNot: [`key`],
                    action: `Pick up key.`,
                    description: `On the ground, there is a golden key. It glistens in the moonlight.`,
                    result: `You pick up the key, and feel empowered about your future.`,
                    addInventory: `key`
                },
                {
                    ifNot: [`cellUnlocked`],
                    action: `Open cell door.`,
                    result: `You try to open the door, but it is locked shut. It's wrought iron bars will not yield, however hard you pull!`
                },
                {
                    if: [`key`],
                    ifNot: [`cellUnlocked`],
                    action: `Unlock cell door.`,
                    result: `You unlock the cell door. It makes a very satisfying clinking sound.`,
                    addFlag: `cellUnlocked`
                },
                {
                    if: [`cellUnlocked`],
                    ifNot: [`cellOpen`],
                    action: `Open cell door.`,
                    result: `The cell door swings open!`,
                    addFlag: `cellOpen`
                },
                {
                    if: [`cellOpen`],
                    action: `Walk out through cell door.`,
                    result: `You walk out of the cell!`,
                    setLocation: `outside`,
                }
            ],
        },
        outside: {
            name: "Freedom!",
            description: `You are outside! You have escaped from the dungeon and are free!`,
            img: `https://placekitten.com/400/400`,
            actions: []
        }
    },

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
    display: function(lastActionMessage='',includeDescription=true) {
        let locationObj = this.data[this.player.location];
        this.$locationTitle.text(locationObj.name);
        let description = '';
        if (lastActionMessage !== '') {
            description += `<p class="lastAction">${lastActionMessage}</p>`;
        }
        if (includeDescription) {
            description += `<p>${locationObj.description}</p>`;
        }
        this.$imgContainer.html(`<img src=${locationObj.img} alt="Image of the current location.">`);

        this.$actionBox.empty();
        
        // Using an arrow function to keep this === the this I want (adventureApp)
        locationObj.actions.filter((action) => {
            return this.checkValidity(action);
        }).forEach((action) => {
            // console.log(action);
            if ('description' in action) {
                description += `<p>${action.description}</p>`;
            }
            
            const actionElement = `
            <li>
            <a href="#">
            ${action.action}
            </a>
            </li>
            `;
            this.$actionBox.append(actionElement);
        });

        // Did the player just look around a bit?
        if (includeDescription) {
            // Yup
            // this.player.add('flags','justLooked');
        }
        else {
            // Nope! Include this option!
            // this.player.remove('flags','justLooked',true);
            this.$actionBox.append(`
                <li>
                    <a href="#">
                        ${this.data.lookAction}
                    </a>
                </li>
            `);
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
                        <a href="#">
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
        // Special case, "look around"
        if (actionDone.trim() === this.data.lookAction) {
            this.display(`You ${this.data.lookAction.toLowerCase()}...`, true);
        }

        // Figure out action and then run it
        let action=null;
        this.data[this.player.location].actions.forEach((act) => {
            if (act.action === actionDone.trim() && this.checkValidity(act)) {
                action = act;
            }
        });
        if (action !== null) {
            if (!('examineRoom' in action)) {
                action.examineRoom=false;
            }
            if ('addInventory' in action) {
                this.player.add('inventory',action.addInventory);
            }
            if ('addFlag' in action) {
                this.player.add('flags',action.addFlag);
            }
            if ('setLocation' in action) {
                this.player.location = action.setLocation;
                action.examineRoom=true;
            }
            this.display(`${action.result}`,action.examineRoom);
        }
    },

    events: function() {
        $('#actionBox').on('click','a',function(event) {
            event.preventDefault();

            adventureApp.doAction($(this).text());
        });
    },

    // Init method
    init: function() {
        this.$imgContainer = $('#imgContainer');
        this.$descriptionBox = $('#descriptionBox');
        this.$actionBox = $('#actionBox');
        this.$itemBox = $('#itemBox');
        this.$locationTitle = $('#locationTitle');

        this.events();

        $('h1').text(this.data.gameName);
        this.display(`You awaken after what feels like a very long slumber...`);
    }
};

// Document ready
$(function() {
    adventureApp.init();
});