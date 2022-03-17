import * as React from 'react';
import { Typography, Box, Dialog, Slide, Drawer, Toolbar } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useParams } from 'react-router';
import axios from 'axios';
import { TransitionProps } from '@mui/material/transitions';
import WSEditorSwaggerPicker from './WSEditorSwaggerPicker';
import WSEditorToolBar from './WSEditorToolBar';
import WSEditorCommandTree, { CommandTreeLeaf, CommandTreeNode } from './WSEditorCommandTree';
import WSEditorCommandGroupContent, { CommandGroup } from './WSEditorCommandGroupContent';
import WSEditorCommandContent, { Command } from './WSEditorCommandContent';


const TopPadding = styled(Box)(({ theme }) => ({
    [theme.breakpoints.up('sm')]: {
        height: '12vh',
    },
}));

const MiddlePadding = styled(Box)(({ theme }) => ({
    height: '6vh'
}));


interface CommandGroupMap {
    [id: string]: CommandGroup
}

interface CommandMap {
    [id: string]: Command
}


interface ResponseCommand {

    names: string[],
    help?: {
        short: string
        lines?: string[]
    }
}

interface ResponseCommands {
    [name: string]: ResponseCommand
}

interface ResponseCommandGroup {
    names: string[],
    help?: {
        short: string
        lines?: string[]
    }
    commands?: ResponseCommands
    commandGroups?: ResponseCommandGroups
}

interface ResponseCommandGroups {
    [name: string]: ResponseCommandGroup
}

// type Argument = {
//     options: string[],
//     type: string,
//     help?: { short: string },
//     required?: boolean,
//     idPart?: string,
//     args?: Argument[]
// }

// type ArgGroups = {
//     args: Argument[],
//     name: string
// }[]

// type ExampleType = {
//     name: string,
//     commands: string[]
// }

// type CommandResource = {
//     id: string,
//     version: string,
//     swagger: string,
// }

// type Command = {
//     help: HelpType,
//     names: string[],
//     resources: CommandResource[],
//     version: string
// }

// type Commands = {
//     [name: string]: Command
// }


// type CommandTree = {
//     names: string[],
//     commandGroups: CommandGroups
// }

// type NumberToString = {
//     [index: number]: string
// }

// type StringToNumber = {
//     [name: string]: number
// }

// type NumberToTreeNode = {
//     [index: number]: TreeNode
// }

// type NumberToCommandGroup = {
//     [index: number]: CommandGroup
// }

// type TreeNode = {
//     id: number,
//     parent: number,
//     droppable: boolean,
//     text: string,
//     data: {
//         hasChildren: boolean,
//         type: string
//     }
// }

// type TreeDataType = TreeNode[]

// type CommandGroups = {
//     [names: string]: 
// }



interface WSEditorProps {
    params: {
        workspaceName: string
    }
}

interface WSEditorState {
    name: string
    plane: string,

    selected: Command | CommandGroup | null,

    commandMap: CommandMap,
    commandGroupMap: CommandGroupMap,
    commandTree: CommandTreeNode[],

    showSwaggerResourcePicker: boolean
}

const swaggerResourcePickerTransition = React.forwardRef(function swaggerResourcePickerTransition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>
) {
    return <Slide direction='up' ref={ref} {...props} />

});

const drawerWidth = 300;

const ContentContainer = styled(Box)(({ theme }) => ({
    color: theme.palette.common.white,
    position: 'absolute',
    left: '6vh',
    right: '6vh',
    top: 64,
    bottom: 0,
    display: 'flex',
    alignItems: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-start',
}));


class WSEditor extends React.Component<WSEditorProps, WSEditorState> {

    constructor(props: WSEditorProps) {
        super(props);
        this.state = {
            name: this.props.params.workspaceName,
            plane: "",
            selected: null,
            commandMap: {},
            commandGroupMap: {},
            commandTree: [],
            showSwaggerResourcePicker: false,
        }
    }

    componentDidMount() {
        this.loadWorkspace();
    }

    loadWorkspace = () => {

        axios.get(`/AAZ/Editor/Workspaces/${this.props.params.workspaceName}`)
            .then(res => {
                const commandMap: CommandMap = {};
                const commandGroupMap: CommandGroupMap = {};

                const buildCommand = (command: ResponseCommand): CommandTreeLeaf => {
                    const cmd: Command = {
                        id: 'command:' + command.names.join('/'),
                        names: command.names,
                        help: command.help,
                    }
                    commandMap[cmd.id] = cmd;
                    return {
                        id: cmd.id,
                        names: [...cmd.names],
                    }
                };

                const buildCommandGroup = (commandGroup: ResponseCommandGroup): CommandTreeNode => {
                    const group: CommandGroup = {
                        id: 'group:' + commandGroup.names.join('/'),
                        names: commandGroup.names,
                        help: commandGroup.help,
                    }

                    commandGroupMap[group.id] = group

                    const node: CommandTreeNode = {
                        id: group.id,
                        names: [...group.names],
                    }

                    if (typeof commandGroup.commands === 'object' && commandGroup.commands !== null) {
                        node['leaves'] = [];

                        for (const name in commandGroup.commands) {
                            const subLeave = buildCommand(commandGroup.commands[name]);
                            node['leaves'].push(subLeave);
                        }
                        node['leaves'].sort((a, b) => a.id.localeCompare(b.id));
                    }

                    if (typeof commandGroup.commandGroups === 'object' && commandGroup.commandGroups !== null) {
                        node['nodes'] = []
                        for (const name in commandGroup.commandGroups) {
                            const subNode = buildCommandGroup(commandGroup.commandGroups[name]);
                            node['nodes'].push(subNode);
                        }
                        node['nodes'].sort((a, b) => a.id.localeCompare(b.id));
                    }
                    return node;
                };

                let commandTree: CommandTreeNode[] = [];

                if (res.data.commandTree.commandGroups) {
                    const cmdGroups: ResponseCommandGroups = res.data.commandTree.commandGroups
                    for (const key in cmdGroups) {
                        commandTree.push(buildCommandGroup(cmdGroups[key]));
                    }
                    commandTree.sort((a, b) => a.id.localeCompare(b.id));
                }

                let selected: Command | CommandGroup | null = null;

                if (this.state.selected != null) {
                    if (this.state.selected.id.startsWith('command:')) {
                        let id: string = this.state.selected.id;
                        if (id in commandMap) {
                            selected = commandMap[id];
                        } else {
                            id = 'group:' + id.slice(8);
                            let parts = id.split('/')
                            while (parts.length > 1 && !(id in commandGroupMap)) {
                                parts = parts.slice(0, -1)
                                id = parts.join('/')
                            }
                            if (id in commandGroupMap) {
                                selected = commandGroupMap[id];
                            }
                        }
                    } else if (this.state.selected.id.startsWith('group:')) {
                        let id: string = this.state.selected.id;
                        let parts = id.split('/');
                        while (parts.length > 1 && !(id in commandGroupMap)) {
                            parts = parts.slice(0, -1)
                            id = parts.join('/')
                        }
                        if (id in commandGroupMap) {
                            selected = commandGroupMap[id];
                        }
                    }
                }

                if (selected == null && commandTree.length > 0) {
                    selected = commandGroupMap[commandTree[0].id];
                }

                this.setState({
                    plane: res.data.plane,

                    commandTree: commandTree,
                    selected: selected,

                    commandMap: commandMap,
                    commandGroupMap: commandGroupMap,
                })

                if (commandTree.length == 0) {
                    this.showSwaggerResourcePicker();
                }
            })
            .catch((err) => console.log(err));
    }

    showSwaggerResourcePicker = () => {
        this.setState({ showSwaggerResourcePicker: true })
    }

    handleSwaggerResourcePickerClose = () => {
        this.setState({
            showSwaggerResourcePicker: false
        })
    }


    handleBackToHomepage = () => {
        window.location.href = `/?#/workspace`
    }

    handleGenerate = () => {

    }

    handleCommandTreeSelect = (nodeId: string) => {
        if (nodeId.startsWith('command:')) {
            this.setState(preState => {
                const selected = preState.commandMap[nodeId];
                return {
                    ...preState,
                    selected: selected,
                }
            })
        } else if (nodeId.startsWith('group:')) {
            this.setState(preState => {
                const selected = preState.commandGroupMap[nodeId];
                return {
                    ...preState,
                    selected: selected,
                }
            })
        }
    }

    render() {
        const { showSwaggerResourcePicker, plane, name, commandTree, selected } = this.state;

        return (
            <React.Fragment>
                <WSEditorToolBar workspaceName={name} onHomePage={this.handleBackToHomepage} onAdd={this.showSwaggerResourcePicker} onGenerate={this.handleGenerate}>
                    {/* <Button onClick={this.showSwaggerResourcePicker}>Add Swagger Resource</Button> */}

                </WSEditorToolBar>

                <Box sx={{display: 'flex'}}>
                    <Drawer
                        variant="permanent"
                        sx={{
                            width: drawerWidth,
                            flexShrink: 0,
                            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
                        }}
                    >
                        <Toolbar />
                        {selected != null &&
                            <WSEditorCommandTree
                                commandTreeNodes={commandTree}
                                onSelected={this.handleCommandTreeSelect}
                                selected={selected!.id}
                            />
                        }
                    </Drawer>

                    <Box component='main' sx={{
                        flexGrow: 1,
                        p: 1,
                    }}>
                        <Toolbar sx={{ flexShrink: 0 }}/>
                        {selected != null && selected.id.startsWith('group:') &&
                            <WSEditorCommandGroupContent commandGroup={selected} />
                        }
                        {selected != null && selected.id.startsWith('command:') &&
                            <WSEditorCommandContent command={selected} />
                        }
                    </Box>
                </Box>

                <Dialog
                    fullScreen
                    open={showSwaggerResourcePicker}
                    onClose={this.handleSwaggerResourcePickerClose}
                    TransitionComponent={swaggerResourcePickerTransition}
                >
                    <WSEditorSwaggerPicker plane={plane} workspaceName={name} onClose={this.handleSwaggerResourcePickerClose} />
                </Dialog>

            </React.Fragment>

        )
    }
}

const WSEditorWrapper = (props: any) => {
    const params = useParams()

    return <WSEditor params={params} {...props} />
}

export { WSEditorWrapper as WSEditor };
