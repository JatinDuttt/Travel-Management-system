package com.travel.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter @Setter @NoArgsConstructor
public class TravelPackage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank private String name;
    @NotBlank private String destination;
    @NotNull @Positive private BigDecimal price;
    @NotNull @FutureOrPresent private LocalDate startDate;
    @Min(0) private int availableSeats;
    @Column(length = 1000) private String description;
}
