import User from "../Model/user.model.js";
import jwt from "jsonwebtoken";

export const generateToken = (userId)=>{
    return jwt.sign({userId},process.env.JWT_SECRET,{ expiresIn: "7d" });
}

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

export const authentication_provider = async(req,res)=>{

    if (!req.user) {
        return res.status(401).json({
            message: "User data not found in request"
        });
    }

    const {provider,email,name,emailVerified,providerId,picture} = req.user;
     
    if(!provider || !providerId){
        return res.status(200).json({message:"Missing data from Provider Authorization Server"});
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    let user = await User.findOne({
        linkedProviders:{
            $elemMatch:{
                provider,
                providerId
            }
        }
    });

    if(!user && normalizedEmail){
        user = await User.findOne({email:normalizedEmail});
    }

    if(!user){
        user = await User.create({
            email:normalizedEmail,
            name:name || null,
            picture:picture || null,
            linkedProviders:[
                {
                    provider,
                    providerId
                }
            ]
        });
    } else {
        const alreadyLinked = user.linkedProviders.some((item)=>{
            return item.provider === provider && item.providerId === providerId
        });

        if(!alreadyLinked){
            user.linkedProviders.push({
                provider,
                providerId
            });
        }

        if(!user.email && normalizedEmail){
            user.email = normalizedEmail;
        }

        if (name) {
            user.name = name;
        }

        if (picture) {
            user.picture = picture;
        }
        await user.save();

    }

    const token = generateToken(user._id);
    const refresh_token = generateRefreshToken(user._id);

    return res.status(200).json({
            message: "Provider authentication successful",
            token, 
            refresh_token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                verified: user.verified,
                linkedProviders: user.linkedProviders,
                premiumAssets: user.premiumAssets
            }
        });
}