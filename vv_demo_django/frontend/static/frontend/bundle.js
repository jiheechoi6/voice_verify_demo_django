(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const ServerRequests = require('./server_requests')


URL = window.URL || window.webkitURL

const toggleError = document.getElementById("toggle-error")
const toggleEnrol = document.getElementById("toggle-enrol");
const enrolmentBox = document.getElementById("enroll-box")
const enrolButton = document.getElementById("enrol-button");
const cancelEnrolButton = document.getElementById("cancel-enrol-button")
const enrolProgressBar = document.getElementById("enrol-progress-bar")
const secondsEnrol = document.getElementById("seconds-left-enrol")
const duplicateIDWarning = document.getElementById("id-duplicate-warning")
const enrollUsernameInput = document.getElementById("input-enroll-username")

const toggleVerify = document.getElementById("toggle-verify");
const verifyBox = document.getElementById("verify-box")
const verifyButton = document.getElementById("verify-button")
const endVerifyButton = document.getElementById("end-verify-button")
const verifyStatusMessage = document.getElementById("verify-status-message")
const usernameNotEnrolled = document.getElementById("id-not-enrolled")

const userList = document.getElementById('user-list')

const REC_DURATION = 500;
const serverRequests = new ServerRequests()

let isEnrolling = false;
let isVerifying = false;
let intervalID;
let audioIntervalID;
let gumstream;
let rec
let cur_uuid
let recorded_count  // keep track of the number of bytes recorded
let users = []
let chunks = []

// Prep user data for list display 
window.addEventListener('load', (event) => {
    serverRequests.getAllUsers().then( data => {
        console.log(data)
        data.users.forEach( user => {
            // console.log(user)
            users.push(user.username)
        })

        displayUserList()
    })
})

let displayUserList = () => {
    // reset first
    userList.innerHTML = document.getElementById('user-list-header').outerHTML

    if(users.length == 0){
        let elem = document.createElement('li')
        elem.classList.add("list-group-item")
        elem.classList.add("text-secondary")
        elem.classList.add("small")
        elem.innerText = "등록된 화자가 없습니다"
        userList.appendChild(elem)
    }
    users.forEach( user => {
        console.log(user)
        let elem = document.createElement('li')
        elem.classList.add("list-group-item")
        elem.innerText = user
        
        // delete button for each user
        let button = document.createElement("button")
        button.type = "button"
        button.classList.add("btn", "btn-outline-danger", "btn-sm")
        button.style.setProperty("float", "right")
        button.innerText = "삭제"
        elem.appendChild(button)

        button.onclick = (e) => {
            let username = e.target.parentNode.textContent.slice(0,-2)
            serverRequests.deleteUser(username).then( () => {
                serverRequests.getAllUsers().then(data => console.log(data.users))
            })
            console.log(e.target.parentNode)
            e.target.parentNode.remove()
        }

        userList.appendChild(elem)
    })
}

//========= Enroll ==========//
enrolButton.onclick = async function onEnrollButtonClick(){
    let username = enrollUsernameInput.value
    // check if username input is empty
    if(username == "" || username == undefined){
        flashMessage(duplicateIDWarning, "아이디를 입력해주세요", true, 2000)
        return
    }
    isEnrolling = true;

   startProcess("enroll", username)
}

/** task = {"enroll", "verify"} */
let startProcess = (task, username) => {
    // startRecording()
    // setTimeout(downloadWav, 4000)
    serverRequests.createStream(username).then(uuid => {
        cur_uuid = uuid
        startRecording()
        audioIntervalID = setInterval(uploadIntervalRecording, REC_DURATION)  // start repeat upload data
        if(task == "enroll"){
            repeatEnrollRequest()  // start repeat enroll request
        }else{
            repeatVerifyRequest()
        }
    }).catch( err => {
        // activate enrol/ve button
        console.log("reached")
        enrolButton.classList.remove("d-none")
        cancelEnrolButton.classList.add("d-none")
        verifyButton.classList.remove("d-none")
        endVerifyButton.classList.add("d-none")
        alert("서버가 정상적으로 작동중이지 않습니다.")
        stopRecording()
    } )
} 

let repeatEnrollRequest = () => {
    let username = document.getElementById("input-enroll-username").value
    requestEnroll(username)
    intervalID = setInterval(function(){
        // uploadIntervalRecording()
        requestEnroll(username)
    }, 1000)
}

let requestEnroll = (username) => {
    serverRequests.requestEnroll(username).then( result => {
        handleEnrollRequestResult(result.code, result.secondsRecorded)
    })
}

/**manipulate DOM according to enrolment result*/
let handleEnrollRequestResult = (statusCode, secondsRecorded) => {
    console.log(statusCode)
    duplicateIDWarning.innerText = ""  // reset warning message first
    let username = enrollUsernameInput.value
    if(statusCode == 411){  // voiceprint not enough. consider it as ongoing process
        // update buttons
        enrolButton.classList.add("d-none")
        cancelEnrolButton.classList.remove("d-none")
        // update progress bar
        let percent = parseFloat(secondsRecorded)/15*100
        enrolProgressBar.style.setProperty("width", percent+"%")
        // update progress message
        secondsEnrol.innerText = "총 "+secondsRecorded+"초의 성문이 녹음되었습니다. 최소 15초가 필요합니다:)."
    }else if(statusCode == 201){  // enroll successful. stop
        cancelEnrolButton.classList.add("d-none")
        enrolButton.classList.remove("d-none")
        // reset progress bar
        enrolProgressBar.style.setProperty("width", "0")  
        // change progress message to success message
        flashMessage(secondsEnrol, username + "님의 성문이 등록되었습니다!", false)
        if(!users.includes(username))  users.push(username)
        displayUserList()
        // downloadWav()
    }else if(statusCode == 409){
        flashMessage(duplicateIDWarning, "해당 아이디의 유저가 이미 존재합니다", true)
    }else{
        cancelEnrolButton.classList.add("d-none")
        enrolButton.classList.remove("d-none")
        enrolProgressBar.style.setProperty("width", "0")  
        console.log("something went wrong internally")
        flashMessage(secondsEnrol, "서버 문제로 실행을 실패하였습니다", true)
    }
    if(statusCode != 411){
        console.log("stop")
        stopRecording()
    }
}

cancelEnrolButton.onclick = function onCancelEnroll(){
    // downloadWav()

    // change buttons
    cancelEnrolButton.classList.add("d-none")
    enrolButton.classList.remove("d-none")
    // stop repeating enrol request 
    stopRecording()
}

//========= Verify ==========//

verifyButton.onclick = function onVerify(){
    let username = document.getElementById("input-verify-username").value
    if(username == "" || username == undefined){
        flashMessage(usernameNotEnrolled, "아이디를 입력해주세요", true, 2000)
        return
    }
    isVerifying = true;
    
    startProcess("verify", username)
}

let handleVerifyRequestResult = (code, secondsRecorded, result) => {
    if(code == 411){  // voiceprint not enough. consider it as ongoing process
        verifyButton.classList.add("d-none")
        endVerifyButton.classList.remove("d-none")
        verifyStatusMessage.innerText = "총 "+secondsRecorded+"초의 성문이 녹음되었습니다. 최소 3초가 필요합니다:)"
        verifyStatusMessage.style.setProperty("color", "black")
    }else if(code == 200){  // verification successful
        displayVerifyResult(verifyStatusMessage, result)
    }else if(code == 404){
        flashMessage(usernameNotEnrolled, "등록된 해당 아이디의 유저가 없습니다", true)
    }else{
        console.log("something went wrong internally")
    }
    if(code != 411 && code != 200){
        stopRecording()
    }
}

let repeatVerifyRequest = () => {
    let username = document.getElementById("input-verify-username").value
    requestVerify(username)
    intervalID = setInterval(function(){requestVerify(username)}, 1000)
}

let requestVerify = (username) => {
    serverRequests.requestVerify(username).then( res => {
        handleVerifyRequestResult(res.code, res.secondsRecorded, res.result)
    })
}

endVerifyButton.onclick = function endVerify(){
    verifyStatusMessage.innerText = "인증 시작 버튼을 눌러주세요"
    verifyStatusMessage.style.setProperty("color", "black")
    endVerifyButton.classList.add("d-none")
    verifyButton.classList.remove("d-none")
    // downloadWav()
    stopRecording()
}

//============= Toggle =============//

toggleEnrol.onclick = function onEnrolToggle(){
    if(isVerifying){
        flashMessage(toggleError, "인증 진행중입니다. 종료후 이용해주세요", true, 2000)
        return
    }

    // update buttons
    toggleVerify.classList.remove('active')
    toggleEnrol.classList.add('active')
    // switch to enrol screen
    enrolmentBox.classList.remove('d-none')
    verifyBox.classList.add('d-none')
}

toggleVerify.onclick = function onVerifyToggle(){
    if(isEnrolling){
        flashMessage(toggleError, "등록 진행중입니다. 종료후 이용해주세요", true, 2000)
        return
    }
    // update buttons
    toggleEnrol.classList.remove('active')
    toggleVerify.classList.add('active')
    // switch to verification screen
    verifyBox.classList.remove('d-none')
    enrolmentBox.classList.add('d-none')
}

//==================== Submit on enter for username input ================//
document.getElementById("input-enroll-username").addEventListener("keyup", function(event) {
    // console.log(event.key)
    if(event.key != "Enter"){
        return
    }
    event.preventDefault();

    enrolButton.click();
})



//=========================================================//
//==================== Helper methods =====================//
//=========================================================//


//==================== Recorder Helper methods =================//
/**
 * @param {string} task - {"enroll", "verify"}
 */
 let startRecording = (task) => {
    if (navigator.mediaDevices) {
        var constraints = { audio: true , video: false };
        
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
            let audioCtx = new AudioContext({sampleRate: 16000})
            // let audioCtx = new AudioContext()
            var frameCount = audioCtx.sampleRate * 2.0;
            var myArrayBuffer = audioCtx.createBuffer(2, frameCount, audioCtx.sampleRate);
            var nowBuffering = myArrayBuffer.getChannelData(1);
            // console.log(nowBuffering)

            gumstream = stream
            input = audioCtx.createMediaStreamSource(stream);

            rec = new Recorder(input, {numChannels:1})
            
            rec.record()
        })
      }
}

let stopRecording = () => {
    console.log("stop enroll " + intervalID)
    console.log("stop audio " + audioIntervalID)
    clearInterval(intervalID)
    clearInterval(audioIntervalID)
    isEnrolling = false
    isVerifying = false
    if(rec){
        rec.stop()
        gumstream.getAudioTracks()[0].stop();
    }
}

let uploadIntervalRecording = () => {
    rec.exportWAV(uploadWavToStream)
    rec.clear()
}

let uploadWavToStream = (blob) => {
    // newblob = blob.slice(recorded_count, blob.size, "audio/wav")
    // recorded_count = blob.size
    serverRequests.uploadDataToStream(blob, cur_uuid)
    // serverRequests.test(blob, cur_uuid)
}

let downloadWav = () => {
    let newBlob = new Blob(chunks, {type : 'audio/wav'})
    let url = URL.createObjectURL(newBlob)
    let a = document.createElement("a")
    document.body.appendChild(a)
    a.style = "display: none";
    a.href = url;
    a.download = "test.wav";
    a.click(); 
}

//==================== General DOM Helper Methods ====================//

let flashMessage = ( container, message, isWarning, duration=10000 ) => {
    container.innerText = message
    if(!isWarning) secondsEnrol.classList.add("text-success")
    setTimeout(function(){
        container.innerText = ""
        container.classList.remove("text-success")
    }, duration)
}

let displayVerifyResult = (container, result) => {
    if(result == "verified"){
        container.innerText = "VERIFIED"
        container.style.setProperty("color", "green")
    }else if(result == "not_verified"){
        container.innerText = "NOT VERIFIED"
        container.style.setProperty("color", "red")
    }else{
        container.innerText = "NOT SURE"
        container.style.setProperty("color", "orange")
    }
}

},{"./server_requests":2}],2:[function(require,module,exports){
class VVRequests {
    /**Make enroll request, parse result and return status code, message */
    requestEnroll = (username) => {
        let code
        return window.fetch('/api/vv/enroll', {
            method: 'POST',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({"username": username})
        }).then( res => {
            code = res.status
            console.log(code)
            if(code != 411){
                return {code: code, secondsRecorded: 0}
            }
            return res.json()
        }).then( res => {
            let seconds = 0
            if( res.hasOwnProperty('secondsRecorded')){
                seconds = res.secondsRecorded
            }
            return { code: code, secondsRecorded: seconds }
        })
    }

    requestVerify = (username) => {
        let code
        return window.fetch('/api/vv/verify', {
            method: 'POST',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({"username": username})
        }).then( res => {
            code = res.status
            if(code == 404){
                return {code: code, secondsRecorded: 0, result: false}
            }
            return res.json()
        }).then( res => {
            let seconds = 0
            let result = false
            if( res.secondsRecorded != undefined ){
                seconds = res.secondsRecorded
            }
            if( res.hasOwnProperty('result') ){
                result = res.result
            }
            return { code: code, secondsRecorded: seconds, result: result }
        })
    }
    
    /** Creates stream and returns uuid */
    createStream = (username) => {
        return window.fetch("/api/vv/create_stream", {
            method: 'POST',
            headers: {'accept': 'application/json', "Content-Type": "application/json"},
            body: JSON.stringify({"username": username})
        }).then( (res) => {
            if(res.status == 201){
                return res.json()
            }else{
                throw res.status
            }
        }
        ).then(res => {return res.uuid})
    }

    uploadDataToStream = (data, uuid) => {
        let fd = new FormData()
        fd.append("data", data)
        // fd.append("uuid", uuid)
        window.fetch('/api/vv/upload_stream_data?uuid='+uuid, {
            method: 'POST',
            // headers: {"Content-Type": "application/json"},
            // headers: {"Content-Type": "multipart/form-data"},
            // body: JSON.stringify({"data": data, "uuid": uuid})
            body: fd
        }).catch(err => {
            console.log(err)
        })
    }

    getAllUsers = () => {
        return window.fetch('/api/user', {
            method: "GET",
            headers: {"Content-Type": "application/json"}
        }).then( res => res.json())
    }

    deleteUser = (username) => {
        return window.fetch('/api/user', {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({"username": username})
        }).then( res => res.status)
    }

    addUser = (username) => {
        return window.fetch('/api/user', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({"username": username, "date": "2021:12:12T12:12"})
        }).then( res => res.status)
    }
}

module.exports = VVRequests

},{}]},{},[1]);
