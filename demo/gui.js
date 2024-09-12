import * as THREE from 'three';

import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';

class Gui {
    constructor( app ){
        this.app = app;
        
        // available model models paths - [model, rotation]
        this.avatarOptions = {
            "Eva": ['https://webglstudio.org/3Dcharacters/Eva/Eva.glb', 0, 'https://webglstudio.org/3Dcharacters/Eva/Eva.png', false],
            "ReadyEva": ['https://webglstudio.org/3Dcharacters/ReadyEva/ReadyEva.glb', 0, 'https://webglstudio.org/3Dcharacters/ReadyEva/ReadyEva.png', false],
            "Witch": ['https://webglstudio.org/3Dcharacters/Eva_Witch/Eva_Witch.glb', 0, 'https://webglstudio.org/3Dcharacters/Eva_Witch/Eva_Witch.png', false],
            "Kevin": ['https://webglstudio.org/3Dcharacters/Kevin/Kevin.glb', 0, 'https://webglstudio.org/3Dcharacters/Kevin/Kevin.png', false],
            "Ada": ['https://webglstudio.org/3Dcharacters/Ada/Ada.glb', 0, 'https://webglstudio.org/3Dcharacters/Ada/Ada.png', false],
            "Woman": ['https://webglstudio.org/3Dcharacters/Woman/Woman.glb', 0, "", true],
            "Dancer": ['https://webglstudio.org/3Dcharacters/Dancer/Dancer.glb', 0, "", true]
        }

        // take canvas from dom, detach from dom, attach to lexgui 
        this.app.renderer.domElement.remove(); // removes from dom
        let main_area = LX.init();
        let [canvas_area, panel_area ] = main_area.split({type: "horizontal", sizes:["80%", "20%"], minimizable: true});
       
        canvas_area.attach( this.app.renderer.domElement );
        canvas_area.onresize = (bounding) => this.app.resize(bounding.width, bounding.height);


        /* Add show/hide right panel button*/
        canvas_area.addOverlayButtons([
            {
                selectable: true,
                selected: true,
                icon: "fa-solid fa-gear",
                name: "Properties",
                callback: (v, e) => {
                    if(main_area.split_extended) {
                        main_area.reduce();
                    }
                    else {
                        main_area.extend();
                    }
                }
            }
        ], {float: 'tvr'});

        this.panel = null;

        this.srcItemSelected = "";
        this.trgItemSelected = "";

       panel_area.addMenubar( m => {
        m.setButtonIcon("Github", "fa-brands fa-github", () => {window.open("https://github.com/upf-gti/retargeting-threejs")}, {float: "right"});   
        });

        this.createSidePanel(panel_area);
        main_area.extend();
        main_area.reduce();
    }

    refresh(){
        this.panel.refresh();
    }

    createTransformPanel(type, title) {
        let avatarName = "";
        let itemSelected = "";
        if(type == "source") {
            avatarName = this.app.currentSourceCharacter;
            itemSelected = this.srcItemSelected;
        }
        else {
            avatarName = this.app.currentCharacter;
            itemSelected = this.trgItemSelected;
        }
        let character = this.app.loadedCharacters[avatarName];

        if(this.dialogTransform) {
            if(this.dialogTransform.title.innerText == avatarName) {
                this.panelTransform.refresh(character, itemSelected);
                return; 
            }
            else {
                this.dialogTransform.close();
            }
        }
        this.skeletonPanel = new LX.Panel("Skeleton");
        this.createSkeletonPanel(this.skeletonPanel, character.skeleton, type);

        this.dialogTransform = new LX.PocketDialog( avatarName, p => {            
            this.panelTransform = p;
            this.panelTransform.refresh = (character, itemSelected) => {     
                p.clear();           
                this.panelTransform.attach( this.skeletonPanel)         
                if(itemSelected) {
                    let root = character.model.name == itemSelected ? character.model : character.model.getObjectByName(itemSelected);
                    if(!root) {
                        root = character.skeleton.bones[0].parent.getObjectByName(itemSelected)
                    }
                    p.addVector3("Position", [root.position.x, root.position.y, root.position.z], (value, event) => {
                        root.position.set(value[0], value[1], value[2]);
                    }, {step:0.01});
                    p.addVector3("Rotation", [root.rotation.x, root.rotation.y, root.rotation.z], (value, event) => {
                        root.rotation.set(value[0], value[1], value[2]);
                    }, {step:0.01});
                    p.addNumber("Scale", root.scale.x, (value, event) => {
                        root.scale.set(value, value, value);
                    }, {step:0.01});                             
                } 
            }
            this.panelTransform.refresh(character, itemSelected);
        }, {closable: true, float: "l", onclose: (root) => {
            
                root.remove();
                this.panelTransform = null;
                this.dialogTransform = null;
            }
        })

    }

    createSidePanel(panel_area) {
        this.panel = new LX.Panel( "Controls", {  draggable: false });
        panel_area.attach(this.panel);
           
        let avatars = [];
        let avatarsWithAnimations = [];
        for(let avatar in this.avatarOptions) {
            if(this.avatarOptions[avatar][3]) {
                avatarsWithAnimations.push({ value: avatar, src: this.avatarOptions[avatar][2] ?? ""})
            }                                   
            avatars.push({ value: avatar, src: this.avatarOptions[avatar][2] ?? ""});                
        }
        
        this.panel.refresh = (force = false) =>{
            let p = this.panel;
            this.panel.clear();
            this.createTargetPanel(this.panel, avatars, force);
            this.createSourcePanel(this.panel, avatarsWithAnimations, force);

            
            p.branch("Retargeting")
            p.addCheckbox("Show skeletons", this.app.showSkeletons, (v) => {
                this.app.changeSkeletonsVisibility(v);
            }, {nameWidth: "auto"})
            p.addCheckbox("Source embedded transforms", this.app.srcEmbeddedTransforms ?? true, (v) => {
                this.app.srcEmbeddedTransforms = v;
            },{nameWidth: "auto"})
            
            p.addCheckbox("Target embedded transforms", this.app.trgEmbeddedTransforms ?? true, (v) => {
                this.app.trgEmbeddedTransforms = v;
            }, {nameWidth: "auto"})
            p.sameLine();
            if(this.app.currentSourceCharacter) {
                p.addButton(null, "Apply retargeting", () => {
                    this.app.applyRetargeting(this.app.srcEmbeddedTransforms, this.app.trgEmbeddedTransforms);
                    this.refresh();
                }, { width: "200px"})
            }
            
            if(this.app.retargeting) {
                p.addButton(null, "Export animation", () => {
                    if(this.app.mixer && this.app.mixer._actions.length) {  
                        this.showExportDialog((name, animation, format) => this.app.exportRetargetAnimation(name, animation, format))                            
                    }
                    else {
                        LX.popup("No retarget animation.", "Warning!", { timeout: 5000})
                        return;
                    }
                })
            }
            p.endLine();
            p.merge();
        }

        this.panel.refresh(false);              
    }
    
    showExportDialog(callback) {
        let options = { modal : true};

        let value = "";

        const dialog = this.prompt = new LX.Dialog("Export retarget animation", p => {
        
            let animation =  this.app.mixer._actions[0]._clip;          
            let name = animation.name;
            let format = 'bvh';
            p.addText(null, name, (v) => {
                name = v;
            }, {placeholder: "...", minWidth:"100px"} );
            p.endLine();
            p.addDropdown("Format", ["bvh", "glb"], format, (v) => {
                format = v;
            })
            p.sameLine(2);
            p.addButton("", options.accept || "OK", (v, e) => { 
                e.stopPropagation();
                if(options.required && value === '') {

                    text += text.includes("You must fill the input text.") ? "": "\nYou must fill the input text.";
                    dialog.close() ;
                }
                else {
                    if(callback) {
                        callback(name, animation, format);
                    }
                    dialog.close() ;
                }
                
            }, { buttonClass: "accept" });
            p.addButton("", "Cancel", () => {if(options.on_cancel) options.on_cancel(); dialog.close();} );
                
        }, options);

        // Focus text prompt
        if(options.input !== false && dialog.root.querySelector('input'))
            dialog.root.querySelector('input').focus();
    }

    createSourcePanel(panel, avatarsWithAnimations, force) {
        // SOURCE AVATAR/ANIMATION
        panel.branch("Source", {icon: "fa-solid fa-child-reaching"});

        panel.sameLine();
        panel.addDropdown("Source", avatarsWithAnimations, this.app.currentSourceCharacter, (value, event) => {
            if(this.dialogTransform) {
                this.dialogTransform.close();
            }
            // upload model
            if (value == "Upload Animation or Avatar") {
                this.uploadAvatar((value, extension) => {
                    
                    if ( !this.app.loadedCharacters[value] ) {
                        document.getElementById("loading").style.display = "block";

                        let modelFilePath = this.avatarOptions[value][0]; 
                        let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                        
                        if( extension == "glb" || extension == "gltf" ) {
                            this.app.loadAvatar(modelFilePath, modelRotation, value, (animations) => { 
                                this.app.changeSourceAvatar(value);
                                if(!animations.length) {
                                    LX.popup("Avatar loaded without animations.", "Warning!", {position: [ "10px", "50px"], timeout: 5000})
                                }
                                avatarsWithAnimations.push({ value: value, src: ""});
                                document.getElementById("loading").style.display = "none";
                                this.refresh();
                            } );
                        }
                        else if( extension == "bvh" || extension == "bvhe") {
                            this.app.loadAnimation(modelFilePath, value, (animations) => {
                                this.app.changeSourceAvatar(value);
                                if(!animations.length) {
                                    LX.popup("Avatar loaded without animations.", "Warning!", {position: [ "10px", "50px"], timeout: 5000})
                                }
                                avatarsWithAnimations.push({ value: value, src: ""});
                                document.getElementById("loading").style.display = "none";
                                this.refresh();
                            })
                        }
                        return;
                    } 

                    // use controller if it has been already loaded in the past
                    this.app.changeSourceAvatar(value);
                    this.srcItemSelected = "";
                    this.refresh(true);
                    // TO  DO: load animations if it has someone

                }, true);
            }
            else {
                // load desired model
                if ( !this.app.loadedCharacters[value] ) {
                    document.getElementById("loading").style.display = "block";
                    let modelFilePath = this.avatarOptions[value][0]; 
                    let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                    this.app.loadAvatar(modelFilePath, modelRotation, value, (animations)=>{ 
                        this.app.changeSourceAvatar(value);
                        if(!animations.length) {
                            LX.popup("Avatar loaded without animations.", "Warning!", {position: [ "10px", "50px"], timeout: 5000})
                        }
                        document.getElementById("loading").style.display = "none";
                        this.refresh();
                    } );
                    return;
                } 
                // use controller if it has been already loaded in the past
                this.app.changeSourceAvatar(value);
                this.srcItemSelected = "";

                this.refresh(true);
            }
        });

        panel.addButton( null, "Upload Animation or Avatar", (v) => {
            this.uploadAvatar((value, extension) => {
                    
                if ( !this.app.loadedCharacters[value] ) {
                    document.getElementById("loading").style.display = "block";
                    let modelFilePath = this.avatarOptions[value][0]; 
                    let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                    if( extension == "glb" || extension == "gltf" ) {
                        this.app.loadAvatar(modelFilePath, modelRotation, value, (animations) => { 
                            this.app.changeSourceAvatar(value);
                            avatarsWithAnimations.push({ value: value, src: ""});
                            if(!animations.length) {
                                LX.popup("Avatar loaded without animations.", "Warning!", {position: [ "10px", "50px"], timeout: 5000})
                            }
                            document.getElementById("loading").style.display = "none";
                            this.refresh(true);
                        } );
                    }
                    else if( extension == "bvh" || extension == "bvhe") {
                        this.app.loadAnimation(modelFilePath, value, (animations) => {
                            this.app.changeSourceAvatar(value);
                            if(!animations.length) {
                                LX.popup("Avatar loaded without animations.", "Warning!", {position: [ "10px", "50px"], timeout: 5000})
                            }
                            avatarsWithAnimations.push({ value: value, src: ""});
                            document.getElementById("loading").style.display = "none";
                            this.refresh(true);
                        })
                    }
                    return;
                } 

                // use controller if it has been already loaded in the past
                this.app.changeSourceAvatar(value);
                this.srcItemSelected = "";

                this.refresh();

            }, true);
        } ,{ width: "40px", icon: "fa-solid fa-cloud-arrow-up" } );
        
        panel.endLine();
        if(this.app.currentSourceCharacter) {
                    
            panel.addButton(null, "Apply original bind pose", () => {
                
                this.app.applyOriginalBindPose(this.app.currentSourceCharacter);
                this.refresh();
            });
            panel.addButton(null, "Open skeleton panel", () => {
                
                this.createTransformPanel("source", "");            
            });
        }
        this.createAnimationPanel(panel);

        panel.merge();
    }

    createTargetPanel(panel, avatars, force) {
        // TARGET AVATAR
        panel.branch("Target", {icon: "fa-solid fa-people-arrows"});
        panel.sameLine();
        panel.addDropdown("Target avatar", avatars, this.app.currentCharacter, (value, event) => {
            if(this.dialogTransform) {
                this.dialogTransform.close();
            }
            // upload model
            if (value == "Upload Avatar") {
                this.uploadAvatar((value) => {
                    
                    if ( !this.app.loadedCharacters[value] ) {
                        document.getElementById("loading").style.display = "block";

                        let modelFilePath = this.avatarOptions[value][0]; 
                        let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                        this.app.loadAvatar(modelFilePath, modelRotation, value, ()=>{ 
                            avatars.push({ value: value, src: ""});
                            this.app.changeAvatar(value);
                            document.getElementById("loading").style.display = "none";
                            this.refresh(true);
                        } );
                        return;
                    } 

                    // use controller if it has been already loaded in the past
                    this.app.changeAvatar(value);
                    this.trgItemSelected = "";

                    this.refresh(true);

                });
            }
            else {
                // load desired model
                if ( !this.app.loadedCharacters[value] ) {
                    document.getElementById("loading").style.display = "block";
                    let modelFilePath = this.avatarOptions[value][0]; 
                    let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                    this.app.loadAvatar(modelFilePath, modelRotation, value, ()=>{ 
                        avatars.push({ value: value, src: ""});
                        this.app.changeAvatar(value);
                        // TO  DO: load animations if it has someone
                        document.getElementById("loading").style.display = "none";
                        this.refresh(true);
                    } );
                    return;
                } 

                // use controller if it has been already loaded in the past
                this.app.changeAvatar(value);
                this.trgItemSelected = "";

                this.refresh();
            }
        });

        panel.addButton( null, "Upload Avatar", (v) => {
            this.uploadAvatar((value) => {
                    
                if ( !this.app.loadedCharacters[value] ) {
                    document.getElementById("loading").style.display = "block";
                    let modelFilePath = this.avatarOptions[value][0]; 
                    let modelRotation = (new THREE.Quaternion()).setFromAxisAngle( new THREE.Vector3(1,0,0), this.avatarOptions[value][1] ); 
                    this.app.loadAvatar(modelFilePath, modelRotation, value, ()=>{ 
                        avatars.push({ value: value, src: ""});
                        this.app.changeAvatar(value);
                        document.getElementById("loading").style.display = "none";
                        // TO  DO: load animations if it has someone
                        this.refresh(true);
                    } );
                    return;
                } 

                // use controller if it has been already loaded in the past
                this.app.changeAvatar(value);
                this.refresh(true);
            });
        } ,{ width: "40px", icon: "fa-solid fa-cloud-arrow-up" } );
        
        if(this.app.currentSourceCharacter && this.app.currentCharacter && this.app.retargeting) {

            panel.addButton(null, "Edit bones mapping", () => {
                this.showBoneMapping();
            }, {width: "40px", icon: "fa-solid fa-bone"});
        }
        panel.endLine();
        
        if(this.app.currentCharacter) {            
            panel.addButton(null, "Apply original bind pose", () => {                
                this.app.applyOriginalBindPose(this.app.currentCharacter);

                this.refresh();
            });
            panel.addButton(null, "Open skeleton panel", () => {
                
                this.createTransformPanel("target", "");            
            });
        }
        panel.merge();
    }

    createAnimationPanel(panel) {
        panel.addTitle("Animation", {icon: "fa-solid fa-hands-asl-interpreting"});
        panel.sameLine();
        let animations = [];
        for(let anim in this.app.loadedCharacters[this.app.currentSourceCharacter].animations) {
           
            animations.push(this.app.loadedCharacters[this.app.currentSourceCharacter].animations[anim].name);            
        }
        panel.addDropdown("Animation", animations, this.app.currentAnimation, (v) => {
            this.app.onChangeAnimation(v);
        });

        panel.addButton("", "<i class='fa fa-solid " + (this.app.playing ? "fa-stop'>": "fa-play'>") + "</i>", (v,e) => {
            this.app.changePlayState();
            panel.refresh();
        }, { width: "40px"});
        panel.endLine(); 
    }

    createSkeletonPanel(panel, skeleton, type, force) {
        const rootBone = skeleton.bones[0].parent ?? skeleton.bones[0];
        let parent = rootBone.parent;
        if(parent && parent.type == "Scene") {
            parent = null;
        }
        let itemSelected = "";
        let sceneTree = {};

        if(type == 'source') {
            // itemSelected = this.srcItemSelected = this.srcItemSelected ? this.srcItemSelected : parent.name;
            itemSelected = this.srcItemSelected = (parent && parent.name ? parent.name : rootBone.name);
        } 
        else {
            // itemSelected = this.trgItemSelected = this.trgItemSelected ? this.trgItemSelected : parent.name;
            itemSelected = this.trgItemSelected = (parent && parent.name ? parent.name : rootBone.name);
        }
        if(force || (type == "source" && !this.srcTree || type == "target" && !this.trgTree)) {
            sceneTree = { 
                id: parent ? parent.name : rootBone.name,
                selected: (parent ? parent.name : rootBone.name) == itemSelected,
                skipVisibility: true
            };
            let children = [];
            if(parent) {
                children.push( {
                    id: rootBone.name,
                    children: [],
                    closed: true,
                    selected: rootBone.name == itemSelected,
                    skipVisibility: true
                })
            }
            const addChildren = (bone, array) => {
                
                for( let b of bone.children ) {
                    
                    if ( ! b.isBone ){ continue; }
                    let child = {
                        id: b.name,
                        children: [],
                        icon: "fa-solid fa-bone",
                        closed: true,
                        selected: b.name == itemSelected,
                        skipVisibility: true
                    }
                    
                    array.push( child );
                    
                    addChildren(b, child.children);
                }
            };
            
            addChildren(rootBone, parent ? children[0].children : children);
            
            sceneTree['children'] = children;
            
        }
        
        if(type == "source") {
            sceneTree = this.srcTree ? this.srcTree.data : sceneTree;
        }
        else {
            sceneTree = this.trgTree ? this.trgTree.data : sceneTree;
        }
        let tree = panel.addTree("Skeleton", sceneTree, { 
            // filter: false,
            id: type,
            rename: false,
            onevent: (event) => { 
                console.log(event.string());
    
                switch(event.type) {
                    case LX.TreeEvent.NODE_SELECTED: 
                        if(event.multiple)
                            console.log("Selected: ", event.node); 
                        else {
                            itemSelected = event.node.id;
                            if(tree.options.id == 'source') {
                                this.srcItemSelected = itemSelected;                                
                            }
                            else {
                                this.trgItemSelected = itemSelected;
                            }
                            //tree.selected = tree.name == itemSelected;
                            this.createTransformPanel(tree.options.id, itemSelected);
                           
                        }
                        break;
                    case LX.TreeEvent.NODE_DELETED: 
                        if(event.multiple)
                            console.log("Deleted: ", event.node); 
                        else
                            console.log(event.node.id + " deleted"); 
                        break;
                    case LX.TreeEvent.NODE_DBLCLICKED: 
                        console.log(event.node.id + " dbl clicked"); 
                        break;
                    case LX.TreeEvent.NODE_CONTEXTMENU: 
                        const m = event.panel;
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        break;
                    case LX.TreeEvent.NODE_DRAGGED: 
                        console.log(event.node.id + " is now child of " + event.value.id); 
                        break;
                    case LX.TreeEvent.NODE_RENAMED:
                        console.log(event.node.id + " is now called " + event.value); 
                        break;
                    case LX.TreeEvent.NODE_VISIBILITY:
                        console.log(event.node.id + " visibility: " + event.value); 
                        break;
                }
            }
        });   
        return tree; 
    }

    uploadAvatar(callback = null, isSource = false) {
        let name, model, extension;
        let rotation = 0;
    
        let title = "Avatar"; 
        let text = "Load a .gltf or a .glb file."
        if(isSource) {
            title = "Animation/Avatar ";
            text = "Load a .bvh, .bvhe, .gltf or .glb file."
        }

        this.avatarDialog = new LX.Dialog("Upload " + title , panel => {
            
            panel.addText(null, text, null, {disabled: true});
            let nameWidget = panel.addText("Name Your " + title, name, (v, e) => {
                if (this.avatarOptions[v]) LX.popup("This name is taken. Please, change it.", null, { position: ["45%", "20%"]});
                name = v;
            });

            let avatarFile = panel.addFile(title + " File", (v, e) => {
                let files = panel.widgets[title + " File"].domEl.children[1].files;
                if(!files.length) {
                    return;
                }
                const path = files[0].name.split(".");
                const filename = path[0];
                extension = path[1];
                const reader = new FileReader();
                if (extension == "glb" || extension == "gltf" || isSource && (extension == "bvh" || extension == "bvhe")) { 
                    model = v;
                    if(!name) {
                        name = filename;
                        nameWidget.set(name)
                    }
                    if(extension == "glb" || extension == "gltf") {
                        reader.readAsDataURL(files[0]);
                    }
                    else {
                        reader.readAsText(files[0]);                    
                    }
                    reader.onload = (e) => {
                        model = e.target.result;
                    }
                }
                else { LX.popup("Only accepts GLB and GLTF formats or BVH and BVHE (only for animations)!"); }
                
            }, {read: false});
            
            panel.addNumber("Apply Rotation", 0, (v) => {
                rotation = v * Math.PI / 180;
            }, { min: -180, max: 180, step: 1 } );
            
            panel.addButton(null, "Upload", () => {
                if (name && model) {
                    if (this.avatarOptions[name]) { LX.popup("This name is taken. Please, change it.", null, { position: ["45%", "20%"]}); return; }
                    this.avatarOptions[name] = [model, rotation, "icon"];
                    
                    panel.clear();
                    this.avatarDialog.root.remove();
                    if (callback) callback(name, extension);
                }
                else {
                    LX.popup("Complete all fields!", null, { position: ["45%", "20%"]});
                }
            });
            panel.root.addEventListener("drop", (v, e) => {

                let files = v.dataTransfer.files;
                if(!files.length) {
                    return;
                }
                for(let i = 0; i < files.length; i++) {

                    const path = files[i].name.split(".");
                    const filename = path[0];
                    const extension = path[1];
                    if (extension == "glb" || extension == "gltf" || isSource && (extension == "bvh" || extension == "bvhe")) { 
                        // Create a data transfer object
                        const dataTransfer = new DataTransfer();
                        // Add file to the file list of the object
                        dataTransfer.items.add(files[i]);
                        // Save the file list to a new variable
                        const fileList = dataTransfer.files;
                        avatarFile.domEl.children[1].files = fileList;
                        avatarFile.domEl.children[1].dispatchEvent(new Event('change'), { bubbles: true });
                        model = v;
                        if(!name) {
                            name = filename;
                            nameWidget.set(name)
                        }
                    }
                }
            })

        }, { size: ["40%"], closable: true, onclose: (root) => { root.remove(); if(this.gui) this.gui.setValue("Avatar File", this.app.currentCharacter)} });

        return name;
    }

    showBoneMapping() {
        if(this.dialog) {
            this.dialog.close();
        }
        this.dialog = new LX.Dialog("Bone Mapping", panel => { 
            let htmlStr = "Select the corresponding bone name of your avatar to match the provided list of bone names. An automatic selection is done, adjust if needed.";
            panel.addTextArea(null, htmlStr, null, {disabled: true, fitHeight: true});
            const bones = this.app.loadedCharacters[this.app.currentCharacter].skeleton.bones;
            let bonesName = [];
            for(let i = 0; i < bones.length; i++) {
                bonesName.push(bones[i].name);
            }
            let i = 0;
            for (const part in this.app.retargeting.boneMap.nameMap) {
                if ((i % 2) == 0) panel.sameLine(2);
                i++;
                panel.addDropdown(part, bonesName, this.app.retargeting.boneMap.nameMap[part], (value, event) => {
                    this.app.retargeting.boneMap.nameMap[part] = value;
                    const srcIdx = findIndexOfBoneByName(this.app.retargeting.srcSkeleton, part);
                    this.app.retargeting.boneMap.idxMap[srcIdx] = i;
                    
                }, {filter: true});
            }
        }, { size: ["80%", "70%"], closable: true, onclose: () => {
            if(this.app.currentAnimation) {
                this.app.bindAnimationToCharacter(this.app.currentAnimation, this.app.currentCharacter);
            }
            this.dialog.panel.clear();
            this.dialog.root.remove();
        } });        
    }
}

function findIndexOfBoneByName( skeleton, name ){
    if ( !name ){ return -1; }
    let b = skeleton.bones;
    for( let i = 0; i < b.length; ++i ){
        if ( b[i].name == name ){ return i; }
    }
    return -1;
}

export {Gui}