const OpenAI = require("openai");
const functions = require("firebase-functions");

// Enter your OpenAI API key and slack webhooks here
const openai = new OpenAI({
  apiKey: "",
});
const slackWebhook = "";


// Prompts for various different functions below
const textPromptDescribeThisLitter = `Please describe and identify all visible pieces of litter. Include the brand (if discernible), an approximate count for each type, and your degree of certainty.`;

const textPromptRunVision = `Please identify and label all visible pieces of litter from the image. Structure your response and return it in JSON.
I will next give you the key value pairs. In the format of key: name | value: describing what the value is supposed to be.
If there is different types of trash I want it returned in an array of objects.
key: type | value: type of litter,
key: brand | value: brand if applicable and if not return N/A for value,
key: quantity | value: the number of litter in the picture
key: certainty | value: the degree of certainty you have in your analysis
The output should omit any explanation. The output should be purely the array with objects inside, provided in JSON format.
`;

function runVisionHelperFunction(categories) {
  if (categories !== undefined) {
    return `Please identify and label all visible pieces of litter from the image. Structure your response and return it in JSON.
I will next give you the key value pairs. In the format of key: name | value: describing what the value is supposed to be.
I want the pieces of trash to be categorized by the types of trash: ${params}. If there is different types of trash that do not fall into any category, do not list it.
key: type | value: type of litter,
key: brand(s) | value: brands if applicable as strings in an array and if not return N/A for value,
key: quantity | value: the number of litter in the picture
key: certainty | value: the degree of certainty you have in your analysis
The output should omit any explanation. The output should be purely the array with objects inside, provided in JSON format.
`;
  } else return textPromptRunVision;
}

const textPromptBrandFinder = `Examine the image and identify the brand of the litter item. There are two cases that will determine your output:
Case 1: the Brand is discernable based on package design with a high degree of certainty.  Return the brand name exclusively in such a case.
Case 2: If a brand is not recognizable in the image, provide a concise item description instead and reason for not being able to determine a brand, refrain from mentioning any brand.`;

const textPromptSlackHandler = `Examine the image and identify whether or not trash has been placed into the appropriate bin. The image may not tell you which bin is being shown (i.e. whether it's trash, recycling, or compost). You will need to discern which bin it is based on what majority trash is in the image. If there are differing types, like aluminum and recyclable items along with compost items, then this is obviously wrong. There are two cases that will determine your output:
Case 1: All the trash is placed in the bin properly.  Return true.
Case 2: If trash is not placed in the bin properly, return the reasoning behind your conclusion. Please be concise.`;


// Firebase cloud functions

exports.rubbishTest = functions.https.onRequest(async (req, res) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  res.status(200).json({ message: "successfull test" });
});


module.exports.describeThisLitter = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).send("No image URL provided");
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: textPromptDescribeThisLitter,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      console.log(response.choices[0]);
      return res.json(response.choices[0].message.content);
    } catch (error) {
      console.error("Error calling OpenAI Vision API:", error);
      res.status(500).send("Error processing image");
    }
  }
);


module.exports.runVision = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { imageUrl, categories } = req.body;
  if (!imageUrl) {
    return res.status(400).send("No image URL provided");
  }

  const gptInstructions = runVisionHelperFunction(categories);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: gptInstructions,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log(response.choices[0]);
    return res.json(response.choices[0].message.content);
  } catch (error) {
    console.error("Error calling OpenAI Vision API:", error);
    res.status(500).send("Error processing image");
  }
});

module.exports.brandFinder = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send("No image URL provided");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textPromptBrandFinder,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    console.log(response.choices[0]);
    return res.json(response.choices[0].message.content);
  } catch (error) {
    console.error("Error calling OpenAI Vision API:", error);
    res.status(500).send("Error processing image");
  }
});


module.exports.brandFinderBase64 = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Takes in imageData as base64 string
    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).send("No image URL provided");
    }


    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: textPromptBrandFinder,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      });

      console.log(response.choices[0]);
      return res.json(response.choices[0].message.content);
    } catch (error) {
      console.error("Error calling OpenAI Vision API:", error);
      res.status(500).send("Error processing image");
    }
  }
);

module.exports.slackHandler = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send("No image URL provided");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textPromptSlackHandler,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    console.log(response.choices[0]);

    const updatedResponse = {
      imageUrl: imageUrl,
      response: response.choices[0].message.content,
    };

    if (
      updatedResponse.response.toLowerCase().indexOf('true') ===-1
    ) {
      await fetch(
        slackWebhook,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: "Whoops! Someone's trash ended up in the wrong bin!",
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: "🚨 Trash Alert! 🚨",
                  emoji: true,
                },
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "Look out, we've got a Trash Panda on the loose! This little critter missed the mark:",
                },
              },
              {
                type: "section",
                block_id: "section567",
                text: {
                  type: "mrkdwn",
                  text:
                    "*Misplaced Trash Report:*\n" +
                    response.choices[0].message.content,
                },
                accessory: {
                  type: "image",
                  image_url: imageUrl,
                  alt_text: "Misplaced trash image",
                },
              },
              {
                type: "section",
                block_id: "section789",
                text: {
                  type: "mrkdwn",
                  text: "Remember, San Francisco's sorting rules are simple: :wastebasket: *Trash* goes in the black bin, :recycle: *Recyclables* in the blue, and :herb: *Compost* in the green. Let's keep our city clean and green!",
                },
              },
            ],
          }),
        }
      )
        .then((response) => response.json())
        .then((data) => console.log(data))
        .catch((error) => console.error("Error:", error));
    }
    return res.json(updatedResponse);
  } catch (error) {
    console.error("Error calling OpenAI Vision API:", error);
    res.status(500).send("Error processing image");
  }
});
