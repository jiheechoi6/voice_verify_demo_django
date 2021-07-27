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
