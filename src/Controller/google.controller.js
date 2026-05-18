import axios from "axios";

export const googleRedirect = async(req,res) =>{
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
    res.redirect(url);
}

export const googleCallBack= async(req,res) =>{
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = process.env.REDIRECT_URI;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    const {code} = req.query;
    try{
        const {data}  = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          });

        const { access_token, id_token } = data;

        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
          });

        console.log(profile);
        
        res.status(200).send(profile).redirect('/');
    }catch(err){
        console.error('Error:', err.response.data.error);
        res.redirect('/');
    }
}