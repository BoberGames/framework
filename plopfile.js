// plopfile.js
module.exports = function (plop) {
    plop.setGenerator('game', {
        description: 'Scaffold a new game',
        prompts: [
            {
                type: 'input',
                name: 'gameName',
                message: 'Game folder name (kebab-case):'
            }
        ],
        actions: [
            {
                type: 'addMany',
                destination: 'games/{{kebabCase gameName}}',
                base: 'tools/templates/game',
                templateFiles: 'tools/templates/game/**/*'
            }
        ]
    });
};
