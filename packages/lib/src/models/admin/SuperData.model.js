import mongoose from "mongoose";

const superDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'specialization',
      'subSpecialization',
      'faqCategory',
      'designation',
      'smsType',
      'socialPlatform',
      'socialMediaTemplateType',
      'bank',
      'documentType',
      'country',
      'state',
      'city',
      'disease',
      'supplier',
      'expenseType',
      'paymentMode',
      'duration'
    ],
  },
  image: {
    type: String,
    default: null,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperData',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

superDataSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Force model update by adding a small change to the schema
superDataSchema.set('autoIndex', true);

const SuperDataModel = mongoose.models.SuperData || mongoose.model("SuperData", superDataSchema);

export default SuperDataModel;
