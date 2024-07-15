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
            "Woman": ['https://webglstudio.org/3Dcharacters/Woman/Woman.glb', 0, "", true]
        }

        // take canvas from dom, detach from dom, attach to lexgui 
        this.app.renderer.domElement.remove(); // removes from dom
        let main_area = LX.init();
        main_area.attach( this.app.renderer.domElement );

        main_area.root.ondrop = (e) => {
			e.preventDefault();
			e.stopPropagation();

			this.app.loadFiles(e.dataTransfer.files, () => this.gui.refresh());      
        };    
        this.panel = null;

        this.createPanel();
    }

    refresh(){
        this.panel.refresh();
    }

    createPanel(){

        let pocketDialog = new LX.PocketDialog( "Controls", p => {
            this.panel = p;
           
            let avatars = [];
            let avatarsWithAnimations = [];
            for(let avatar in this.avatarOptions) {
                if(this.avatarOptions[avatar][3]) {
                    avatarsWithAnimations.push({ value: avatar, src: this.avatarOptions[avatar][2] ?? ""})
                }                                   
                avatars.push({ value: avatar, src: this.avatarOptions[avatar][2] ?? ""});                
            }
            this.panel.refresh = () =>{
                this.panel.clear();
                this.createSourcePanel(this.panel, avatarsWithAnimations);

                this.createTargetPanel(this.panel, avatars);
                // if(this.app.currentSourceCharacter) {

                //     p.addButton(null, "Apply original bind position", () => {
                //         let character = this.app.loadedCharacters[this.app.currentCharacter];
                //         character.skeleton = character.bindSkeleton;
                //         character.skeleton.update();
                //     })
                // }                                
                
                p.addCheckbox("Show skeletons", this.app.showSkeletons, (v) => {
                    this.app.changeSkeletonsVisibility(v);
                })

                if(this.app.currentSourceCharacter) {
                    p.addButton(null, "Apply retargeting", () => {
                        this.app.applyRetargeting();
                        this.refresh();
                    }, { width: "200px"})
                }
                
            }

            this.panel.refresh();           

        }, { size: ["20%", null], float: "left", draggable: false });
        
        
        if ( window.innerWidth < window.innerHeight || pocketDialog.title.offsetWidth > (0.21*window.innerWidth) ){
            pocketDialog.title.click();
        }

    }

    createSourcePanel(panel, avatarsWithAnimations) {
        // SOURCE AVATAR/ANIMATION
        panel.branch("Source", {icon: "fa-solid fa-child-reaching"});

        panel.sameLine();
        panel.addDropdown("Source", avatarsWithAnimations, this.app.currentSourceCharacter, (value, event) => {
            
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
                            this.app.loadAnimation(modelFilePath, modelRotation, value, (animations) => {
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
                    this.refresh();
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
                this.refresh();
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
                            this.refresh();
                        } );
                    }
                    else if( extension == "bvh" || extension == "bvhe") {
                        this.app.loadAnimation(modelFilePath, modelRotation, value, (animations) => {
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
                this.refresh();

            }, true);
        } ,{ width: "40px", icon: "fa-solid fa-cloud-arrow-up" } );
        
        panel.endLine();
        if(this.app.currentSourceCharacter) {
            let character = this.app.loadedCharacters[this.app.currentSourceCharacter];
           if(character.skeletonHelper) {
                let root = character.skeletonHelper.bones[0].parent ?? character.model;
                panel.addVector3("Position", [root.position.x, root.position.y, root.position.z], (value, event) => {
                    root.position.set(value[0], value[1], value[2]);
                }, {step:0.01});
                panel.addVector3("Rotation", [root.rotation.x, root.rotation.y, root.rotation.z], (value, event) => {
                    root.rotation.set(value[0], value[1], value[2]);
                }, {step:0.01});
                panel.addNumber("Scale", root.scale.x, (value, event) => {
                    root.scale.set(value, value, value);
                }, {step:0.01});                             
            }
            panel.addButton(null, "Bind pose", () => {
                this.app.loadedCharacters[this.app.currentSourceCharacter].skeleton.pose();
                let parent = this.app.loadedCharacters[this.app.currentSourceCharacter].skeleton.bones[0].parent;
                if(parent && !parent.isBone) {
                    let bone = this.app.loadedCharacters[this.app.currentSourceCharacter].skeleton.bones[0];
                    bone.matrix.copy( parent.matrixWorld ).invert();
					bone.matrix.multiply( bone.matrixWorld );
                    bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
                    bone.updateWorldMatrix(false, true);
                }
                this.refresh();
            });
        }
        this.createKeyframePanel(panel);

        panel.merge();
    }

    createTargetPanel(panel, avatars) {
        // TARGET AVATAR
        panel.branch("Target", {icon: "fa-solid fa-people-arrows"});
        panel.sameLine();
        panel.addDropdown("Target avatar", avatars, this.app.currentCharacter, (value, event) => {
            
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
                            this.refresh();
                        } );
                        return;
                    } 

                    // use controller if it has been already loaded in the past
                    this.app.changeAvatar(value);
                    this.refresh();
                    // TO  DO: load animations if it has someone

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
                        this.refresh();
                    } );
                    return;
                } 

                // use controller if it has been already loaded in the past
                this.app.changeAvatar(value);
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
                        this.refresh();
                    } );
                    return;
                } 

                // use controller if it has been already loaded in the past
                this.app.changeAvatar(value);
                this.refresh();
            });
        } ,{ width: "40px", icon: "fa-solid fa-cloud-arrow-up" } );
        
        if(this.app.currentSourceCharacter && this.app.currentCharacter && this.app.retargeting) {

            panel.addButton(null, "Edit bones mapping", () => {
                this.showBoneMapping();
            }, {width: "40px", icon: "fa-solid fa-bone"});
        }
        panel.endLine();
        
        if(this.app.currentCharacter) {
            let character = this.app.loadedCharacters[this.app.currentCharacter];
            if(character.skeletonHelper) {
                let root = character.skeletonHelper.bones[0].parent ?? character.model;
                panel.addVector3("Position", [root.position.x, root.position.y, root.position.z], (value, event) => {
                    root.position.set(value[0], value[1], value[2]);
                }, {step:0.01});
                panel.addVector3("Rotation", [root.rotation.x, root.rotation.y, root.rotation.z], (value, event) => {
                    root.rotation.set(value[0], value[1], value[2]);
                }, {step:0.01});
                panel.addNumber("Scale", root.scale.x, (value, event) => {
                    root.scale.set(value, value, value);
                }, {step:0.01});                             
            }
            panel.addButton(null, "Bind pose", () => {                
                this.app.loadedCharacters[this.app.currentCharacter].skeleton.pose();
                let parent = this.app.loadedCharacters[this.app.currentCharacter].skeleton.bones[0].parent;
                if(parent && !parent.isBone) {
                    let bone = this.app.loadedCharacters[this.app.currentCharacter].skeleton.bones[0];
                    bone.matrix.copy( parent.matrixWorld ).invert();
					bone.matrix.multiply( bone.matrixWorld );
                    bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
                    bone.updateWorldMatrix(false, true);
                }
                this.refresh();
            });
        }
        panel.merge();
    }

    createKeyframePanel(panel) {
        panel.addTitle("Animation", {icon: "fa-solid fa-hands-asl-interpreting"});
        panel.sameLine();
        panel.addDropdown("Animation", Object.keys(this.app.loadedAnimations), this.app.currentAnimation, (v) => {
            this.app.onChangeAnimation(v);
        });

        panel.addButton("", "<i class='fa fa-solid " + (this.app.playing ? "fa-stop'>": "fa-play'>") + "</i>", (v,e) => {
            this.app.changePlayState();
            panel.refresh();
        }, { width: "40px"});
        panel.endLine(); 
    }

    uploadAvatar(callback = null, isSource = false) {
        let name, model, extension;
        let rotation = 0;
    
        let text = "Avatar"; 
        if(isSource) {
            text = "Animation/Avatar ";
        }

        this.avatarDialog = new LX.Dialog("Upload " + text , panel => {
            
            let nameWidget = panel.addText("Name Your " + text, name, (v, e) => {
                if (this.avatarOptions[v]) LX.popup("This name is taken. Please, change it.", null, { position: ["45%", "20%"]});
                name = v;
            });

            let avatarFile = panel.addFile(text + " File", (v, e) => {
                let files = panel.widgets[text + " File"].domEl.children[1].files;
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

        }, { size: ["40%"], closable: true, onclose: (root) => { root.remove(); this.gui.setValue("Avatar File", this.app.currentCharacter)} });

        return name;
    }

    showBoneMapping() {
        let dialog = new LX.Dialog("Bone Mapping", panel => { 
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
            dialog.panel.clear();
            dialog.root.remove();
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