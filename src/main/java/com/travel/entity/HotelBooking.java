package com.travel.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class HotelBooking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @JsonIgnore @ManyToOne(optional = false)
    private User user;
    @ManyToOne(optional = false)
    private Hotel hotel;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private int rooms;
    private BigDecimal totalPrice;
    @Enumerated(EnumType.STRING)
    private BookingStatus status;
    private LocalDateTime createdAt;

    @JsonProperty("userEmail")
    public String getUserEmail() { return user.getEmail(); }
}
