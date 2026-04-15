// import mongoose from "mongoose";


// const linkedProviderSchema = new mongoose.Schema({
//     provider:{
//         type: String,
//         enum:['google','facebook'],
//         required:true
//     },
//     providerId:{
//         type: String,
//         required:true,
//     }
// }, { _id: false });

// const userSchema = new mongoose.Schema({
//     name:{
//         type: String,
//         default:null,
//         required:[true, "Username is required"]
//     },
//     email:{
//         type: String,
//         default:null,
//         required: [true, "Email is required"],
//         unique: [true,"Email has to be unique"],
//     },
//     picture:{
//         type:String,
//         default:null
//     },
//     linkedProviders: {
//         type: [linkedProviderSchema],
//         default: []
//     },
//     premiumAssets: {
//         type: [String],
//         default: []
//     }
// },{
//     timestamps:true,
// });

// userSchema.index(
//     {
//         "linkedProviders.provider": 1,
//         "linkedProviders.providerId": 1
//     },
//     {
//         unique: true,
//         sparse: true
//     }
// );

// const User = mongoose.model('User',userSchema);

// export default User;