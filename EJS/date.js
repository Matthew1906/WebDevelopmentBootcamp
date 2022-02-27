module.exports.getDate = ()=>{
    const today = new Date();
    const options = {
        weekday:'long',
        day:'numeric',
        month:'long',
        year: 'numeric' 
    }
    return today.toLocaleDateString('id', options)
}
