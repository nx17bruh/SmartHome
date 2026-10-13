# 🏠 Smart Home Automation Using IoT

An IoT-based Smart Home Automation System that allows users to remotely control a light and a fan and monitor real-time temperature and humidity through a website. The system uses a **NodeMCU ESP8266**, **DHT11 sensor**, **2-channel relay module**, and **Firebase Realtime Database**.

## 📌 Project Overview

The project connects hardware components to a web-based dashboard through Wi-Fi and Firebase. Users can monitor environmental conditions and control connected appliances from a phone or computer.

## 🚀 **Live Demo**

Check out the live website: [SmartHome](https://nx17bruh.github.io/SmartHome/)

## 🎯 Objectives

- Monitor room temperature and humidity.
- Remotely switch a light ON and OFF.
- Remotely switch a fan ON and OFF.
- Turn all connected appliances OFF using one button.
- Demonstrate communication between IoT hardware, a cloud database, and a website.

## ✨ Features

- 🌡️ Real-time temperature monitoring
- 💧 Humidity monitoring
- 💡 Remote light control
- 🌀 Remote fan control
- 🔴 All OFF control
- 📱 Website accessible from a phone or computer
- ☁️ Firebase Realtime Database integration
- 📶 Wireless communication using Wi-Fi

## 🧰 Hardware Components

| Component | Purpose |
|---|---|
| NodeMCU ESP8266 | Main microcontroller with Wi-Fi |
| DHT11 sensor | Measures temperature and humidity |
| 2-channel 5V relay module | Switches the light and fan circuits |
| LED light module | Demonstrates light automation |
| DC fan | Demonstrates fan automation |
| Breadboard | Circuit prototyping |
| Jumper wires | Electrical connections |
| USB cable | Programming and powering the NodeMCU |
| Suitable power supply | Powers the relay and appliances according to their ratings |

## 💻 Software and Technologies

- **Arduino IDE** — programming and uploading code to the ESP8266
- **C/C++** — embedded firmware
- **HTML** — website structure
- **CSS** — website styling
- **JavaScript** — website interactions and Firebase communication
- **Firebase Realtime Database** — cloud data storage and synchronization
- **GitHub** — source-code hosting and project documentation

## ⚙️ System Architecture

```text
DHT11 Sensor
     |
     v
NodeMCU ESP8266 <---- Wi-Fi ----> Firebase Realtime Database
     |                                      ^
     |                                      |
     | GPIO                                 v
     v                              Website Dashboard
2-Channel Relay                    (Phone / Computer)
   |          |
   v          v
 Light       Fan
```

Sensor readings travel from the DHT11 through the NodeMCU to Firebase. The website reads the stored readings and sends appliance commands to Firebase. The NodeMCU reads those commands and controls the relay module.

## 🔌 Pin Connections

| Component | NodeMCU Pin |
|---|---|
| DHT11 data | D4 |
| Light relay input | D1 |
| Fan relay input | D2 |
| Relay module ground | GND, as required by the module |

**Note:** Verify the relay module's supply requirements and input compatibility before connecting power. Use a suitable regulated supply for the loads, and avoid connecting household mains voltage to an exposed student prototype.

## ☁️ Firebase Database Structure

The project uses these database paths:

| Path | Data | Purpose |
|---|---|---|
| `/Temperature` | Number | Current temperature |
| `/Humidity` | Number | Current relative humidity |
| `/Light` | Boolean | Light state |
| `/Fan` | Boolean | Fan state |

For the appliance controls:

- `true` — ON
- `false` — OFF

**Important:** Firebase paths are case-sensitive. The website and ESP8266 must use exactly the same capitalization.

## 🔄 Working Process

1. The DHT11 measures room temperature and humidity.
2. The NodeMCU reads the sensor values.
3. The ESP8266 connects to a 2.4 GHz Wi-Fi network.
4. Sensor readings are uploaded to Firebase Realtime Database.
5. The website displays temperature, humidity, and appliance states.
6. When a user clicks a control button, the website updates the corresponding Firebase value.
7. The NodeMCU reads the updated value and changes the relay input.
8. The relay switches the corresponding light or fan circuit.
9. The All OFF button sets both appliance states to OFF.

## 🛠️ Installation and Setup

### 1. Install Arduino IDE

Download Arduino IDE from the official website:

https://www.arduino.cc/en/software

### 2. Configure ESP8266

Install ESP8266 board support in Arduino IDE and select the appropriate NodeMCU ESP8266 board and COM port.

### 3. Install Required Libraries

Install the libraries used by the firmware, including:

- ESP8266WiFi
- DHT sensor library
- Firebase ESP Client

Some libraries may require their documented dependencies.

### 4. Configure Wi-Fi and Firebase

Enter your Wi-Fi credentials and Firebase configuration in the firmware. Use the correct Firebase Realtime Database URL and the authentication method configured for your project.

**Security:** Do not commit Wi-Fi passwords, private credentials, or secret keys to a public repository. Configure Firebase Authentication and appropriate database security rules before deploying the project.

### 5. Upload the Firmware

Connect the NodeMCU to your computer using USB, compile the firmware, and upload it through Arduino IDE. Open Serial Monitor at the baud rate configured in your code to check connection status and sensor readings.

### 6. Configure the Website

Open the website files and configure the Firebase web application settings. Run or deploy the website using your chosen hosting method.

### 7. Test the System

- Verify Wi-Fi connectivity.
- Check sensor readings in Firebase.
- Open the website dashboard.
- Test Light ON/OFF.
- Test Fan ON/OFF.
- Verify that All OFF turns both appliances off.

## 📱 Website Interface

The website includes:

- Login page
- Temperature display
- Humidity display
- Light ON/OFF controls
- Fan ON/OFF controls
- All OFF button

Add screenshots of your actual login page and dashboard to this repository to document the final interface.

## 📊 Results

The prototype demonstrates:

- Wi-Fi connectivity using NodeMCU ESP8266
- Temperature and humidity monitoring using DHT11
- Sensor data exchange through Firebase Realtime Database
- Remote light and fan switching through the website
- Centralized OFF control for both appliances

## 🚀 Future Enhancements

- Add more home appliances.
- Develop a dedicated Android application.
- Integrate voice control.
- Add motion, smoke, or gas sensors.
- Improve authentication and access control.
- Add historical temperature and humidity charts.
- Implement alerts and automation rules.

## 🎓 Academic Project

**Project Title:** Smart Home Automation Using IoT  
**Subject:** 202045613 – Element of IoT  
**Guide:** Dr. Falgun Thakkar  
**Institution:** G H Patel College of Engineering and Technology (GCET), CVM University  
**Group ID:** IoT15

## 📄 License

This project was developed for educational purposes. Add a license file if you intend to specify how others may use, modify, and distribute the source code.

## 📧 Contact

For any inquiries, reach out at  [Mail](mailto:nx17bruh@gmail.com) or connect via GitHub Issues.

Developed with ❤️ by nx17bruh
