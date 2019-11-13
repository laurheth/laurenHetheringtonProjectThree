const adventureApp = {
    $imgContainer: null,
    $descriptionBox: null,
    $actionBox: null,
    $itemBox: null,
    $locationTitle: null,

    // Game data! This object will be a beast to write, so I hope you enjoy it.
    data: {
        dungeonCell: {
            name: 'Dungeon Cell',
            description: `You are in a dark and cold dungeon cell. Moonlight comes in through the barred window, and dampness accumulates on the cold walls. You have no recollection of how you got here, but it probably kind of sucked.`,
            img: `https://placekitten.com/100/100`,
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
            img: `https://placekitten.com/100/100`,
            actions: []
        }
    },

    // Player data
    player: {
        location: 'dungeonCell',
        inventory: [],
        flags: [],
        checkCondition: function(condition) {
            return this.inventory.includes(condition) || this.flags.includes(condition);
        }
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
    displayRoom: function(lastActionMessage='') {
        let locationObj = this.data[this.player.location];
        this.$locationTitle.text(locationObj.name);
        let description = `${lastActionMessage} <p>${locationObj.description}</p>`;
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
        this.$descriptionBox.html(description);

        this.$itemBox.empty();
        this.player.inventory.forEach((item) => {
            this.$itemBox.append(`
                <li>
                    <a href="#">
                        ${item}
                    </a>
                </li>
            `)
        });
    },

    doAction: function(actionDone) {
        // console.log(actionDone);
        const action = this.data[this.player.location].actions.filter((act) => {
            return act.action === actionDone.trim() && this.checkValidity(act);
        })
        if (action.length > 0) {
            if ('addInventory' in action[0]) {
                console.log(action[0].addInventory);
                this.player.inventory.push(action[0].addInventory);
            }
            if ('addFlag' in action[0]) {
                console.log(action[0].addFlag);
                this.player.flags.push(action[0].addFlag);
            }
            if ('setLocation' in action[0]) {
                this.player.location = action[0].setLocation;
            }
            this.displayRoom(`<p>${action[0].result}</p>`);
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

        this.displayRoom(`<p>You awaken after what feels like a very long slumber...</p>`);
    }
};

// Document ready
$(function() {
    adventureApp.init();
});